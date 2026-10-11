/**
 * Date and time helpers for the tour flow.
 *
 * Two things drive the shape of this file:
 *
 * 1. Postgres returns DATE as "2026-10-05" and TIME as "09:00:00".
 *    `new Date("2026-10-05")` parses that as UTC midnight, which
 *    renders as the *previous* day anywhere west of Greenwich — so
 *    these are split and rebuilt as local dates instead.
 *
 * 2. Times travel to the backend in 24-hour "HH:MM", which is what
 *    the TIME column and the controller's `new Date(\`${date}T${time}\`)`
 *    validation both expect. The old page sent "9:00 AM" and relied on
 *    the browser being lenient. Display formatting happens here.
 */

// Mirrors the backend's 14-day window (MAX_DAYS_AHEAD in
// appointmentController.js), so the picker can't offer a date the
// server will reject.
export const MAX_DAYS_AHEAD = 14;

export const TIME_OPTIONS = [
  "09:00", "10:00", "11:00", "12:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
];

/** "09:00" -> "9:00 AM". Tolerates the "09:00:00" Postgres returns. */
export const formatTime = (time) => {
  if (!time) return "";
  const [rawHours, rawMinutes = "00"] = String(time).split(":");
  const hours = Number(rawHours);
  if (Number.isNaN(hours)) return String(time);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${rawMinutes} ${suffix}`;
};

/** "2026-10-05" -> a local Date, without the UTC-midnight shift. */
export const parseDateOnly = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = String(dateString).slice(0, 10).split("-").map(Number);
  if ([year, month, day].some((n) => Number.isNaN(n))) return null;
  return new Date(year, month - 1, day);
};

/** Local "YYYY-MM-DD". Deliberately not toISOString(), which shifts by timezone. */
export const toDateString = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

/** The next MAX_DAYS_AHEAD days, starting today. */
export const upcomingDays = (count = MAX_DAYS_AHEAD) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, offset) => {
    const day = new Date(today);
    day.setDate(today.getDate() + offset);
    return day;
  });
};

/** "2026-10-05" -> "Monday, Oct 5" */
export const formatDateLong = (dateString) => {
  const date = parseDateOnly(dateString);
  if (!date) return String(dateString ?? "");
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
};

/** "2026-10-05" -> "Mon" */
export const shortWeekday = (dateString) => {
  const date = typeof dateString === "string" ? parseDateOnly(dateString) : dateString;
  return date ? date.toLocaleDateString("en-US", { weekday: "short" }) : "";
};
