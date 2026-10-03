const pool = require("../config/db.js");
const crypto = require("crypto");
const { notify } = require("../utils/notify.js");

const MAX_DAYS_AHEAD = 14;

/**
 * appointments.appointment_date is NOT NULL and cannot be relaxed
 * without a migration, so a request that names no date stores this
 * sentinel instead. It doubles as a "no preference" marker that the
 * UI branches on.
 *
 * 1970 is a safe choice precisely because validateSlotDate rejects
 * anything in the past — so a sentinel can never be mistaken for a
 * real offered slot, and no landlord is ever shown "January 1, 1970"
 * unless the UI forgets to check. Any date field that can hold a
 * request row must be read through isDateLessRequest() rather than
 * formatted directly.
 */
const NO_DATE_REQUEST = "1970-01-01";
const NO_TIME_REQUEST = "00:00";

/** True when a row's date is the no-preference sentinel. */
const isDateLessRequest = (date) => String(date ?? "").slice(0, 10) === NO_DATE_REQUEST;

/**
 * Shared by the tenant request and the landlord's 3-slot batch, so a
 * requested date and a proposed date are held to the same window.
 * Returns a reason string on failure, or null when the date is fine.
 */
const validateSlotDate = ({ appointment_date, appointment_time }) => {
  if (!appointment_date || !appointment_time) {
    return "appointment_date and appointment_time are required";
  }
  const now = new Date();
  const maxDate = new Date(now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const slotDate = new Date(`${appointment_date}T${appointment_time}`);
  if (Number.isNaN(slotDate.getTime()) || slotDate < now || slotDate > maxDate) {
    return "Slots must be valid, in the future, and within the next 14 days";
  }
  return null;
};

/**
 * Loads a property and checks the caller owns it. Returns
 * { status, message } on failure, or { property } on success —
 * the same shape loadParticipantConversation uses.
 */
const loadOwnedProperty = async (propertyId, userId, isAdmin = false) => {
  const result = await pool.query(
    "SELECT property_id, owner_id, address FROM properties WHERE property_id = $1 AND availability_status != 'archived'",
    [propertyId],
  );
  if (result.rows.length === 0) {
    return { status: 404, message: "Property not found" };
  }
  if (result.rows[0].owner_id !== userId && !isAdmin) {
    return { status: 403, message: "You do not own this property" };
  }
  return { property: result.rows[0] };
};

// POST /appointments/request  [auth required] — tenant asks to visit
//
// Opens a negotiation. The row created here is the "request": it
// records the date the tenant asked for and stays pending for the
// entire exchange, including across rejections. proposed_by =
// tenant_id is what distinguishes it from the landlord's proposals.
//
const requestTour = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { property_id, appointment_date, appointment_time, note } = req.body || {};

    if (!property_id) {
      return res.status(422).json({ success: false, message: "property_id is required" });
    }

    if (appointment_date || appointment_time) {
      const dateError = validateSlotDate({ appointment_date, appointment_time });
      if (dateError) {
        return res.status(422).json({ success: false, message: dateError });
      }
    }

    const propResult = await pool.query(
      "SELECT property_id, owner_id, address FROM properties WHERE property_id = $1 AND availability_status != 'archived'",
      [property_id],
    );
    if (propResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    const property = propResult.rows[0];

    // Any signed-in user may ask to view, per the agreed rule — but
    // asking to tour your own flat is a mistake, not a request.
    if (property.owner_id === userId) {
      return res.status(422).json({ success: false, message: "You cannot request a tour of your own property" });
    }

    // The unique index enforces this too; checking first lets the
    // tenant get a readable message instead of a 500.
    const dupe = await pool.query(
      `SELECT appointment_id FROM appointments
       WHERE tenant_id = $1 AND property_id = $2 AND status = 'pending'
         AND proposed_by = $1`,
      [userId, property_id],
    );
    if (dupe.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You already have an open tour request for this property",
      });
    }

    const batchId = `REQ-${crypto.randomInt(1000, 999999)}`;

    // A request with no stated preference stores the sentinel rather
    // than NULL, which the column would reject.
    const hasPreference = Boolean(appointment_date && appointment_time);
    const storedDate = hasPreference ? appointment_date : NO_DATE_REQUEST;
    const storedTime = hasPreference ? appointment_time : NO_TIME_REQUEST;

    const inserted = await pool.query(
      `INSERT INTO appointments (owner_id, tenant_id, property_id, appointment_date, appointment_time, status, appointment_batch_id, proposed_by)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $2)
       RETURNING appointment_id, appointment_date, appointment_time`,
      [property.owner_id, userId, property_id, storedDate, storedTime, batchId],
    );

    // The tenant's name goes in the bell text: a landlord reading a
    // push notification needs to know who is asking, not just that
    // somebody is. The JWT carries no name, so it comes from here.
    // Genuinely best-effort — the request row is already stored, and a
    // failed lookup must only cost the nicer wording, not the request.
    let tenantName = "A tenant";
    try {
      const tenantResult = await pool.query("SELECT name FROM users WHERE user_id = $1", [userId]);
      tenantName = tenantResult.rows[0]?.name || tenantName;
    } catch (err) {
      console.error("tenant name lookup error: ", err.message);
    }

    // Best-effort — a failed notification must not fail the request.
    notify({
      userId: property.owner_id,
      type: "tour_requested",
      title: "New tour request",
      message: note
        ? `${tenantName} wants to view ${property.address}. Note: ${note}`
        : `${tenantName} wants to view ${property.address}.`,
      linkUrl: "/tour-requests",
    }).catch((err) => console.error("notify error: ", err.message));

    return res.status(201).json({
      appointment: inserted.rows[0],
      appointment_batch_id: batchId,
      property_id,
      status: "pending",
      message: "Tour requested. The landlord has been notified.",
    });
  } catch (err) {
    // The partial unique index, if two requests race past the check above.
    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "You already have an open tour request for this property",
      });
    }
    console.error("requestTour error: ", err);
    return res.status(500).json({ success: false, message: "Failed to request tour" });
  }
};

// POST /appointments  [landlord only] — propose exactly 3 distinct slots
//
// With `request_id`, this answers a tenant's request: the 3 new rows
// join that request's batch so the tenant sees them alongside it.
// Without it, this is the original standalone batch.
const createAppointmentBatch = async (req, res) => {
  try {
    const ownerId = req.user.user_id;
    const { property_id, tenant_id, slots, request_id } = req.body || {};

    if (!property_id || !Array.isArray(slots) || slots.length !== 3) {
      return res.status(422).json({ success: false, message: "property_id and exactly 3 slots are required" });
    }
    if (!request_id && !tenant_id) {
      return res.status(422).json({ success: false, message: "tenant_id is required when not answering a request" });
    }

    const { status, message, property } = await loadOwnedProperty(property_id, ownerId, req.user.is_admin);
    if (!property) {
      return res.status(status).json({ success: false, message });
    }

    // Answering a request: the tenant and batch come from the request
    // row, not the body, so a client can't attach slots to someone
    // else's negotiation.
    let batchId;
    let targetTenantId = tenant_id;
    if (request_id) {
      const reqResult = await pool.query(
        "SELECT * FROM appointments WHERE appointment_id = $1",
        [request_id],
      );
      if (reqResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Tour request not found" });
      }
      const request = reqResult.rows[0];
      if (request.owner_id !== ownerId && !req.user.is_admin) {
        return res.status(403).json({ success: false, message: "You do not own this property" });
      }
      if (request.status !== "pending") {
        return res.status(409).json({ success: false, message: `This tour request is already ${request.status}` });
      }
      targetTenantId = request.tenant_id;
      batchId = request.appointment_batch_id;
    } else {
      batchId = `APT-B-${crypto.randomInt(1000, 999999)}`;
    }

    const seen = new Set();
    for (const slot of slots) {
      const dateError = validateSlotDate(slot);
      if (dateError) {
        return res.status(422).json({ success: false, message: dateError });
      }
      const key = `${slot.appointment_date}T${slot.appointment_time}`;
      if (seen.has(key)) {
        return res.status(422).json({ success: false, message: "Slots must be distinct" });
      }
      seen.add(key);
    }

    // Re-proposing after a rejection: the previous round is already
    // cancelled, but proposing again before the tenant responds should
    // replace it rather than stack two competing sets.
    await pool.query(
      `UPDATE appointments SET status = 'cancelled', cancellation_reason = 'Superseded by a new set of times'
       WHERE appointment_batch_id = $1 AND status = 'pending' AND proposed_by = $2`,
      [batchId, ownerId],
    );

    const proposedSlots = [];
    for (const slot of slots) {
      const result = await pool.query(
        `INSERT INTO appointments (owner_id, tenant_id, property_id, appointment_date, appointment_time, status, appointment_batch_id, proposed_by)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, $1)
         RETURNING appointment_id, appointment_date, appointment_time`,
        [ownerId, targetTenantId, property_id, slot.appointment_date, slot.appointment_time, batchId],
      );
      proposedSlots.push(result.rows[0]);
    }

    notify({
      userId: targetTenantId,
      type: "tour_proposed",
      title: "Tour slots proposed",
      message: `The landlord proposed 3 tour times for ${property.address}. Please pick one or reject them.`,
      linkUrl: request_id ? `/tour/${property_id}` : `/appointments?batch=${batchId}`,
    }).catch((err) => console.error("notify error: ", err.message));

    return res.status(201).json({
      appointment_batch_id: batchId,
      property_id,
      owner_id: ownerId,
      tenant_id: targetTenantId,
      status: "pending",
      proposed_slots: proposedSlots,
    });
  } catch (err) {
    console.error("createAppointmentBatch error: ", err);
    return res.status(500).json({ success: false, message: "Failed to propose tour slots" });
  }
};

// PATCH /appointments/:id/confirm  [tenant only]
// Spec sends confirmed_appointment_id in the body; :id in the URL is treated
// as a fallback in case the client just hits the same id it's confirming.
const confirmAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.user_id;
    const { confirmed_appointment_id } = req.body || {};
    const targetId = confirmed_appointment_id || id;

    const appResult = await pool.query(
      "SELECT * FROM appointments WHERE appointment_id = $1",
      [targetId],
    );
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    const appointment = appResult.rows[0];
    if (appointment.tenant_id !== tenantId) {
      return res.status(403).json({ success: false, message: "This appointment does not belong to you" });
    }
    if (appointment.status !== "pending") {
      return res.status(409).json({ success: false, message: `Appointment is already ${appointment.status}` });
    }

    // A request row carries the no-preference sentinel, so confirming
    // one would book a tour on 1970-01-01 and render as a real date.
    // Only a landlord's proposed slot can be confirmed.
    if (isDateLessRequest(appointment.appointment_date)) {
      return res.status(409).json({
        success: false,
        message: "This is a viewing request, not a proposed time. Pick one of the offered times.",
      });
    }

    await pool.query("UPDATE appointments SET status = 'confirmed' WHERE appointment_id = $1", [targetId]);

    if (appointment.appointment_batch_id) {
      // Everything else in the negotiation is now moot: the sibling
      // proposals, and the tenant's original request row. Cancelling
      // that row is what retires the uq_appointments_open_request_per_tenant
      // index entry — leaving it pending would lock the tenant out of
      // ever requesting another tour for this property.
      await pool.query(
        `UPDATE appointments
         SET status = 'cancelled', cancellation_reason = 'Tour confirmed'
         WHERE appointment_batch_id = $1
           AND appointment_id != $2
           AND status = 'pending'`,
        [appointment.appointment_batch_id, targetId],
      );
    }

    await notify({
      userId: appointment.owner_id,
      type: "tour_confirmed",
      title: "Tour confirmed",
      message: `Tenant confirmed a tour for ${appointment.appointment_date} at ${appointment.appointment_time}.`,
      linkUrl: `/appointments/${targetId}`,
    });

    return res.status(200).json({
      appointment_id: appointment.appointment_id,
      property_id: appointment.property_id,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      status: "confirmed",
      message: "Tour confirmed. Landlord notified.",
    });
  } catch (err) {
    console.error("confirmAppointment error: ", err);
    return res.status(500).json({ success: false, message: "Failed to confirm appointment" });
  }
};

// PATCH /appointments/:id/reject  [tenant only]
// Rejecting is per-request, not per-slot: the tenant is turning down
// the landlord's 3 times, not picking which of them to dislike. All
// pending proposals in the batch are cancelled and the request row is
// deliberately left pending so the landlord can immediately offer
// another set — that's the loop the tenant asked for.
const rejectProposalSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.user_id;
    const { reason } = req.body || {};

    const appResult = await pool.query(
      "SELECT * FROM appointments WHERE appointment_id = $1",
      [id],
    );
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    const appointment = appResult.rows[0];
    if (appointment.tenant_id !== tenantId) {
      return res.status(403).json({ success: false, message: "This appointment does not belong to you" });
    }

    const batchId = appointment.appointment_batch_id;
    if (!batchId) {
      return res.status(422).json({ success: false, message: "These times are not part of a tour request" });
    }

    // Confirming an already-confirmed slot means the negotiation is
    // over; rejecting it then would be silently rewriting history.
    if (appointment.status === "confirmed") {
      return res.status(409).json({ success: false, message: "Cannot reject a confirmed tour" });
    }

    // proposed_by = the landlord is what separates the 3 proposals from
    // the tenant's own request row. Without it this would cancel the
    // request too and close off the loop.
    const cancelled = await pool.query(
      `UPDATE appointments
       SET status = 'cancelled', cancellation_reason = $1
       WHERE appointment_batch_id = $2 AND status = 'pending' AND proposed_by != $3
       RETURNING appointment_id`,
      [reason || "Tenant requested different times", batchId, tenantId],
    );

    if (cancelled.rows.length === 0) {
      return res.status(409).json({ success: false, message: "There are no proposed times left to reject" });
    }

    notify({
      userId: appointment.owner_id,
      type: "tour_rejected",
      title: "Tour times rejected",
      message: reason
        ? `The tenant asked for different times: ${reason}`
        : "The tenant rejected the proposed times and is waiting for new ones.",
      linkUrl: "/tour-requests",
    }).catch((err) => console.error("notify error: ", err.message));

    return res.status(200).json({
      appointment_batch_id: batchId,
      cancelled: cancelled.rows.length,
      message: "Times rejected. The landlord has been notified to propose new ones.",
    });
  } catch (err) {
    console.error("rejectProposalSlots error: ", err);
    return res.status(500).json({ success: false, message: "Failed to reject proposed times" });
  }
};

// GET /appointments  [auth required]
const listAppointments = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await pool.query(
      `SELECT a.appointment_id, a.property_id, p.address, a.appointment_date, a.appointment_time, a.status,
              a.appointment_batch_id, a.proposed_by, a.owner_id, a.tenant_id,
              a.cancellation_reason,
              cp.user_id AS counterpart_id, cp.name AS counterpart_name, cp.contact_number AS counterpart_phone
       FROM appointments a
       JOIN properties p ON p.property_id = a.property_id
       JOIN users cp ON cp.user_id = (CASE WHEN a.owner_id = $1 THEN a.tenant_id ELSE a.owner_id END)
       WHERE a.owner_id = $1 OR a.tenant_id = $1
       ORDER BY a.appointment_date ASC, a.appointment_time ASC`,
      [userId],
    );

    const data = result.rows.map((row) => ({
      appointment_id: row.appointment_id,
      property_id: row.property_id,
      address: row.address,
      counterpart_id: row.counterpart_id,
      counterpart_name: row.counterpart_name,
      counterpart_phone: row.counterpart_phone,
      appointment_date: row.appointment_date,
      appointment_time: row.appointment_time,
      status: row.status,
      // Lets the client group a request with its rounds of proposals
      // without a second round-trip. See migration 002.
      appointment_batch_id: row.appointment_batch_id,
      proposed_by: row.proposed_by,
      is_request: row.proposed_by != null && row.proposed_by === row.tenant_id,
      is_proposal: row.proposed_by != null && row.proposed_by === row.owner_id,
      // True when the tenant asked without naming a date, so the
      // sentinel never has to be compared against on the client.
      is_date_less: isDateLessRequest(row.appointment_date),
      cancellation_reason: row.cancellation_reason,
    }));

    return res.status(200).json({ data });
  } catch (err) {
    console.error("listAppointments error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch appointments" });
  }
};

// PATCH /appointments/:id/cancel  [auth required — either party]
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const { cancellation_reason } = req.body || {};

    const appResult = await pool.query("SELECT * FROM appointments WHERE appointment_id = $1", [id]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    const appointment = appResult.rows[0];
    if (appointment.owner_id !== userId && appointment.tenant_id !== userId && !req.user.is_admin) {
      return res.status(403).json({ success: false, message: "You are not part of this appointment" });
    }

    await pool.query(
      "UPDATE appointments SET status = 'cancelled', cancellation_reason = $1 WHERE appointment_id = $2",
      [cancellation_reason || null, id],
    );

    const otherPartyId = appointment.owner_id === userId ? appointment.tenant_id : appointment.owner_id;
    await notify({
      userId: otherPartyId,
      type: "tour_cancelled",
      title: "Tour cancelled",
      message: cancellation_reason
        ? `A tour was cancelled: ${cancellation_reason}`
        : "A scheduled tour was cancelled.",
      linkUrl: `/appointments/${id}`,
    });

    return res.status(200).json({ appointment_id: Number(id), status: "cancelled" });
  } catch (err) {
    console.error("cancelAppointment error: ", err);
    return res.status(500).json({ success: false, message: "Failed to cancel appointment" });
  }
};

module.exports = {
  requestTour,
  createAppointmentBatch,
  confirmAppointment,
  rejectProposalSlots,
  listAppointments,
  cancelAppointment,
};