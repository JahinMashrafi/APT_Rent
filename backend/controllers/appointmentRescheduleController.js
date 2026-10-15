const pool = require("../config/db.js");
const AppError = require("../utils/AppError.js");
const { notify } = require("../utils/notify.js");
const { expirePastAppointments } = require("../services/appointmentLifecycle.js");
const { APP_TIMEZONE, MAX_DAYS_AHEAD, normalizeDate, normalizeTime } = require("../utils/appointmentTime.js");

// Whoever moves the slot becomes its proposer (proposed_by) and the OTHER party must confirm,
// so the appointment always goes back to 'pending' (never auto-confirmed).
const RESCHEDULABLE = ["pending", "confirmed", "expired"];

// DATE/TIME are returned as plain text so JSON never shifts the day because of time zones.
const RETURN_COLS = `
  appointment_id, property_id, owner_id, tenant_id, status, reschedule_count, appointment_batch_id,
  to_char(appointment_date, 'YYYY-MM-DD') AS appointment_date,
  to_char(appointment_time, 'HH24:MI')    AS appointment_time,
  to_char(previous_date,    'YYYY-MM-DD') AS previous_date,
  to_char(previous_time,    'HH24:MI')    AS previous_time,
  rescheduled_at`;

const parseId = (raw) => {
  if (!/^\d+$/.test(String(raw))) {
    throw AppError.validation("Invalid appointment id.", [{ field: "id", issue: "Must be a positive integer." }]);
  }
  return Number(raw);
};

// PATCH /appointments/:id/reschedule  [either party or admin]
const rescheduleAppointment = async (req, res) => {
  const id = parseId(req.params.id);
  const userId = req.user.user_id;
  const { appointment_date, appointment_time, reason } = req.body || {};

  // 1. validate input
  const details = [];
  const date = normalizeDate(appointment_date);
  const time = normalizeTime(appointment_time);
  if (!date) details.push({ field: "appointment_date", issue: "Required, format YYYY-MM-DD, must be a real date." });
  if (!time) details.push({ field: "appointment_time", issue: "Required, format HH:mm (or 9:00 AM)." });
  if (details.length) throw AppError.validation("Invalid field value provided.", details);

  await expirePastAppointments();

  const client = await pool.connect();
  let updated, otherPartyId, actorRole;
  try {
    await client.query("BEGIN");

    // 2. lock the row so two requests can't reschedule it at once
    const found = await client.query("SELECT * FROM appointments WHERE appointment_id = $1 FOR UPDATE", [id]);
    if (found.rows.length === 0) throw AppError.notFound("Appointment not found");
    const appt = found.rows[0];

    const isOwner = appt.owner_id === userId;
    const isTenant = appt.tenant_id === userId;
    if (!isOwner && !isTenant && !req.user.is_admin) throw AppError.forbidden("You are not part of this appointment");
    actorRole = isTenant && !isOwner ? "tenant" : "owner";

    // 3. state rules
    if (!RESCHEDULABLE.includes(appt.status)) {
      throw AppError.businessRule(`A ${appt.status} appointment cannot be rescheduled. Create a new tour request instead.`);
    }

    // 4. new slot must be in the future and inside the booking window
    const slot = await client.query(
      `SELECT (($1::date + $2::time) AT TIME ZONE $3) >  NOW()                                  AS in_future,
              (($1::date + $2::time) AT TIME ZONE $3) <= NOW() + make_interval(days => $4::int) AS in_window,
              EXISTS (SELECT 1 FROM appointments
                       WHERE appointment_id = $5 AND appointment_date = $1::date AND appointment_time = $2::time) AS same_slot`,
      [date, time, APP_TIMEZONE, MAX_DAYS_AHEAD, id],
    );
    const s = slot.rows[0];
    if (!s.in_future) {
      throw AppError.validation("Invalid field value provided.", [
        { field: "appointment_date", issue: "The new date/time must be in the future." },
      ]);
    }
    if (!s.in_window) {
      throw AppError.validation("Invalid field value provided.", [
        { field: "appointment_date", issue: `The new date/time must be within the next ${MAX_DAYS_AHEAD} days.` },
      ]);
    }
    if (s.same_slot && appt.status !== "expired") {
      throw AppError.validation("Invalid field value provided.", [
        { field: "appointment_date", issue: "The new date/time is the same as the current one." },
      ]);
    }

    // 5. no double booking on the same property
    const clash = await client.query(
      `SELECT 1 FROM appointments
        WHERE property_id = $1 AND appointment_id <> $2
          AND appointment_date = $3::date AND appointment_time = $4::time
          AND status IN ('pending', 'confirmed')
        LIMIT 1`,
      [appt.property_id, id, date, time],
    );
    if (clash.rows.length > 0) {
      throw AppError.conflict("Another tour is already booked for this property at that date and time.", [
        { field: "appointment_time", issue: "Slot already taken." },
      ]);
    }

    // 6. save: keep the old slot as history, set the new one
    const upd = await client.query(
      `UPDATE appointments
          SET previous_date    = appointment_date,
              previous_time    = appointment_time,
              appointment_date = $2::date,
              appointment_time = $3::time,
              status           = 'pending'::appointment_status_enum,
              reschedule_count = reschedule_count + 1,
              rescheduled_at   = NOW(),
              proposed_by      = $4,
              updated_at       = NOW()
        WHERE appointment_id = $1
        RETURNING ${RETURN_COLS}`,
      [id, date, time, userId],
    );
    updated = upd.rows[0];

    await client.query("COMMIT");
    otherPartyId = actorRole === "tenant" ? appt.owner_id : appt.tenant_id;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (err.code === "23505" && err.constraint === "uq_appointments_open_request_per_tenant") {
      throw AppError.conflict("The tenant already has an open tour request for this property.", [
        { field: "appointment_id", issue: "Cancel or finish the other pending request first." },
      ]);
    }
    throw err;
  } finally {
    client.release();
  }

  // 7. notify the other person (a notification failure must not fail the request)
  try {
    await notify({
      userId: otherPartyId,
      type: "tour_rescheduled",
      title: "Tour rescheduled",
      message:
        `A tour for property #${updated.property_id} moved to ${updated.appointment_date} at ${updated.appointment_time}` +
        ". Please confirm the new time." +
        (reason ? ` Reason: ${String(reason).slice(0, 200)}` : ""),
      linkUrl: `/appointments/${updated.appointment_id}`,
    });
  } catch (e) {
    console.error("rescheduleAppointment notify failed:", e.message);
  }

  return res.status(200).json({
    appointment_id: updated.appointment_id,
    property_id: updated.property_id,
    appointment_date: updated.appointment_date,
    appointment_time: updated.appointment_time,
    previous_date: updated.previous_date,
    previous_time: updated.previous_time,
    status: updated.status,
    reschedule_count: updated.reschedule_count,
    message: "Tour rescheduled. Waiting for the other party to confirm the new time.",
  });
};

// GET /appointments/:id  [either party or admin]
const getAppointment = async (req, res) => {
  const id = parseId(req.params.id);
  const userId = req.user.user_id;
  await expirePastAppointments();

  const result = await pool.query(
    `SELECT ${RETURN_COLS}, cancellation_reason,
            (((appointment_date + appointment_time) AT TIME ZONE $2) < NOW()) AS is_past
       FROM appointments WHERE appointment_id = $1`,
    [id, APP_TIMEZONE],
  );
  if (result.rows.length === 0) throw AppError.notFound("Appointment not found");
  const a = result.rows[0];
  if (a.owner_id !== userId && a.tenant_id !== userId && !req.user.is_admin) {
    throw AppError.forbidden("You are not part of this appointment");
  }
  return res.status(200).json({
    ...a,
    can_reschedule: RESCHEDULABLE.includes(a.status),
    timezone: APP_TIMEZONE,
  });
};

module.exports = { rescheduleAppointment, getAppointment };