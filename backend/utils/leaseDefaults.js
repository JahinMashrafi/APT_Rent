// Default lease wording + small date helpers shared by contract creation and the lease summary editor.

const pad = (n) => String(n).padStart(2, "0");
const parseYmd = (s) => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return { y, m, d }; };
const toYmd = (dt) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;

/** "2026-11-01" + 12 months -> "2027-11-01" (clamps 31st -> month end). */
const addMonths = (ymd, months) => {
  const { y, m, d } = parseYmd(ymd);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return toYmd(target);
};

/** Whole months between two YYYY-MM-DD dates (floor). */
const monthsBetween = (a, b) => {
  const A = parseYmd(a); const B = parseYmd(b);
  let months = (B.y - A.y) * 12 + (B.m - A.m);
  if (B.d < A.d) months -= 1;
  return Math.max(months, 0);
};

const longDate = (ymd) => {
  const { y, m, d } = parseYmd(ymd);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
};

/** The INITIAL terms for a new lease. Stored in the database like any other text, so the landlord can rewrite all of it. */
const buildDefaultTerms = ({ startDate, endDate, deposit }) => [
  "• Rent amount is fixed for the duration of the lease.",
  `• Start date: ${longDate(startDate)}.`,
  `• End date: ${longDate(endDate)}.`,
  "• Payment due 1st–5th of each month.",
  "• Tenant responsible for minor repairs under ৳2,000; landlord is responsible for structural and major repairs.",
  "• No subletting.",
  "• No structural modifications.",
  "• Pets allowed with prior written permission only.",
  "• 30 days written notice required for termination.",
  "• Security deposit will be forfeited if vacated early without notice.",
  `• Security deposit of ৳${Number(deposit || 0).toFixed(2)} returned within 15 days of move-out if no damage is found.`,
].join("\n");

const todayYmd = () => {
  const make = (tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  try { return make(process.env.APP_TIMEZONE || "Asia/Dhaka"); } catch { return make("Asia/Dhaka"); }
};

/** 8 -> "8 months", 12 -> "1 year", 18 -> "1 year 6 months", 24 -> "2 years", 25 -> "2 years 1 month". */
const formatDuration = (totalMonths) => {
  const n = Math.max(0, Math.round(Number(totalMonths) || 0));
  const plural = (v, word) => `${v} ${word}${v === 1 ? "" : "s"}`;
  if (n < 12) return plural(n, "month");
  const years = Math.floor(n / 12);
  const months = n % 12;
  return months ? `${plural(years, "year")} ${plural(months, "month")}` : plural(years, "year");
};

module.exports = { addMonths, monthsBetween, buildDefaultTerms, todayYmd, longDate, formatDuration };