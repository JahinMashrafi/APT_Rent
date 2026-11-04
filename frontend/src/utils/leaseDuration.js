// Lease duration helpers shared by the lease summary editor and the contracts page.
const pad = (n) => String(n).padStart(2, "0");

export const addMonths = (ymd, months) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(target.getUTCDate())}`;
};

export const monthsBetween = (a, b) => {
  const [ay, am, ad] = String(a).slice(0, 10).split("-").map(Number);
  const [by, bm, bd] = String(b).slice(0, 10).split("-").map(Number);
  let months = (by - ay) * 12 + (bm - am);
  if (bd < ad) months -= 1;
  return Math.max(months, 0);
};

/** Under 12 months: "n month(s)". Otherwise "n year(s)" plus leftover months: "1 year 6 months", "2 years". */
export const formatDuration = (totalMonths) => {
  const n = Math.max(0, Math.round(Number(totalMonths) || 0));
  const plural = (v, word) => `${v} ${word}${v === 1 ? "" : "s"}`;
  if (n < 12) return plural(n, "month");
  const years = Math.floor(n / 12);
  const months = n % 12;
  return months ? `${plural(years, "year")} ${plural(months, "month")}` : plural(years, "year");
};