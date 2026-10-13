const pool = require("../config/db.js");
const crypto = require("crypto");
const { notify } = require("../utils/notify.js");

const MAX_DAYS_AHEAD = 14;

// POST /appointments  [landlord only] — propose exactly 3 distinct slots
const createAppointmentBatch = async (req, res) => {
  try {
    const ownerId = req.user.user_id;
    const { property_id, tenant_id, slots } = req.body || {};

    if (!property_id || !tenant_id || !Array.isArray(slots) || slots.length !== 3) {
      return res.status(422).json({ success: false, message: "property_id, tenant_id, and exactly 3 slots are required" });
    }

    const propCheck = await pool.query(
      "SELECT owner_id FROM properties WHERE property_id = $1 AND availability_status != 'archived'",
      [property_id],
    );
    if (propCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    if (propCheck.rows[0].owner_id !== ownerId && !req.user.is_admin) {
      return res.status(403).json({ success: false, message: "You do not own this property" });
    }

    const now = new Date();
    const maxDate = new Date(now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000);
    const seen = new Set();

    for (const slot of slots) {
      if (!slot.appointment_date || !slot.appointment_time) {
        return res.status(422).json({ success: false, message: "Each slot needs appointment_date and appointment_time" });
      }
      const slotDate = new Date(`${slot.appointment_date}T${slot.appointment_time}`);
      if (Number.isNaN(slotDate.getTime()) || slotDate < now || slotDate > maxDate) {
        return res.status(422).json({ success: false, message: "Slots must be valid, in the future, and within the next 14 days" });
      }
      const key = `${slot.appointment_date}T${slot.appointment_time}`;
      if (seen.has(key)) {
        return res.status(422).json({ success: false, message: "Slots must be distinct" });
      }
      seen.add(key);
    }

    const batchId = `APT-B-${crypto.randomInt(1000, 999999)}`;
    const proposedSlots = [];

    for (const slot of slots) {
      const result = await pool.query(
        `INSERT INTO appointments (owner_id, tenant_id, property_id, appointment_date, appointment_time, status, appointment_batch_id)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)
         RETURNING appointment_id, appointment_date, appointment_time`,
        [ownerId, tenant_id, property_id, slot.appointment_date, slot.appointment_time, batchId],
      );
      proposedSlots.push(result.rows[0]);
    }

    await notify({
      userId: tenant_id,
      type: "tour_proposed",
      title: "Tour slots proposed",
      message: `The landlord proposed 3 tour times for property #${property_id}. Please confirm one.`,
      linkUrl: `/appointments?batch=${batchId}`,
    });

    return res.status(201).json({
      appointment_batch_id: batchId,
      property_id,
      owner_id: ownerId,
      tenant_id,
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

    await pool.query("UPDATE appointments SET status = 'confirmed' WHERE appointment_id = $1", [targetId]);

    if (appointment.appointment_batch_id) {
      await pool.query(
        "UPDATE appointments SET status = 'cancelled' WHERE appointment_batch_id = $1 AND appointment_id != $2 AND status = 'pending'",
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

// GET /appointments  [auth required]
const listAppointments = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await pool.query(
      `SELECT a.appointment_id, a.property_id, p.address, a.appointment_date, a.appointment_time, a.status,
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
      counterpart_name: row.counterpart_name,
      counterpart_phone: row.counterpart_phone,
      appointment_date: row.appointment_date,
      appointment_time: row.appointment_time,
      status: row.status,
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

module.exports = { createAppointmentBatch, confirmAppointment, listAppointments, cancelAppointment };