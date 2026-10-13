const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Dhaka";
const MAX_DAYS_AHEAD = 14; // same rule as createAppointmentBatch

/** "2026-10-20" -> "2026-10-20" (only if it is a real calendar date), else null. */
function normalizeDate(value) {
  if (typeof value !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  const real = dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  return real ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Accepts "14:30", "14:30:00", "9:00 AM", "9 pm" -> "HH:MM" (24h), else null. */
function normalizeTime(value) {
  if (typeof value !== "string") return null;
  const m = /^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*([AaPp][Mm])?$/.exec(value.trim());
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] === undefined ? 0 : Number(m[2]);
  const sec = m[3] === undefined ? 0 : Number(m[3]);
  const meridiem = m[4] ? m[4].toLowerCase() : null;
  if (min > 59 || sec > 59) return null;
  if (meridiem) {
    if (h < 1 || h > 12) return null;
    if (meridiem === "pm" && h !== 12) h += 12;
    if (meridiem === "am" && h === 12) h = 0;
  } else if (h > 23) {
    return null;
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

module.exports = { APP_TIMEZONE, MAX_DAYS_AHEAD, normalizeDate, normalizeTime };