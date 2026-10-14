const pool = require("../config/db.js");
const { APP_TIMEZONE } = require("../utils/appointmentTime.js");

const COMPLETE_AFTER_MINUTES = 60;
// Off by default. Set APPOINTMENT_AUTO_COMPLETE=true in .env to also move
// 'confirmed' appointments to 'completed' 60 minutes after they start.
const AUTO_COMPLETE = process.env.APPOINTMENT_AUTO_COMPLETE === "true";

/** One sweep. Never throws. */
async function expirePastAppointments(db = pool) {
  try {
    // pending + date/time already passed  ->  expired
    const expired = await db.query(
      `UPDATE appointments
          SET status = 'expired', updated_at = NOW()
        WHERE status = 'pending'
          AND appointment_date <> DATE '1970-01-01'
          AND ((appointment_date + appointment_time) AT TIME ZONE $1) < NOW()`,
      [APP_TIMEZONE],
    );

    let completedCount = 0;
    if (AUTO_COMPLETE) {
      const completed = await db.query(
        `UPDATE appointments
            SET status = 'completed', updated_at = NOW()
          WHERE status = 'confirmed'
            AND ((appointment_date + appointment_time) AT TIME ZONE $1)
                < NOW() - make_interval(mins => $2::int)`,
        [APP_TIMEZONE, COMPLETE_AFTER_MINUTES],
      );
      completedCount = completed.rowCount;
    }

    return { expired: expired.rowCount, completed: completedCount };
  } catch (err) {
    console.error("[appointments] expiry sweep failed:", err.message);
    return { expired: 0, completed: 0, error: err.message };
  }
}

/** Runs one sweep now, then repeats every APPOINTMENT_SWEEP_MINUTES (default 60). */
function startAppointmentSweeper() {
  const minutes = Number(process.env.APPOINTMENT_SWEEP_MINUTES) || 60;

  const log = (r) => {
    if (r.expired || r.completed) {
      console.log(`[appointments] sweep: ${r.expired} expired, ${r.completed} completed`);
    }
  };

  console.log(`[appointments] expiry sweeper started, runs every ${minutes} minute(s)`);
  expirePastAppointments().then(log);

  const timer = setInterval(async () => log(await expirePastAppointments()), minutes * 60 * 1000);
  timer.unref();
  return timer;
}

module.exports = { expirePastAppointments, startAppointmentSweeper };