const pool = require("../config/db.js");

const DEFAULT_TZ = "Asia/Dhaka";
const formatterFor = (tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
const todayParts = () => {
  let fmt;
  try { fmt = formatterFor(process.env.APP_TIMEZONE || DEFAULT_TZ); } catch { fmt = formatterFor(DEFAULT_TZ); }
  const parts = fmt.formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get("year"), month: get("month"), day: get("day") };
};
const pad = (n) => String(n).padStart(2, "0");
const DUE_DAY = 5;

// GET /tenant/dashboard  [tenant]
// Only an ACTIVE lease appears here (the landlord's activation is what makes it real). A signed-but-not-yet-active
// lease is reported separately as `pending_lease` so the page can say what it is waiting for.
const getTenantDashboard = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.contract_id, c.rate::float AS rate, c.deposit::float AS deposit,
            c.status::text AS status, c.start_date::text AS start_date, c.end_date::text AS end_date,
            p.property_id, p.address, p.bedroom, p.bathroom, p.size_sqft, o.name AS owner_name
       FROM contracts c
       JOIN properties p ON p.property_id = c.property_id
       JOIN users o ON o.user_id = c.owner_id
      WHERE c.tenant_id = $1 AND c.status::text = 'active'
      ORDER BY c.start_date DESC LIMIT 1`,
    [req.user.user_id],
  );
  if (rows.length === 0) {
    const pending = await pool.query(
      `SELECT c.contract_id, c.status::text AS status, p.address
         FROM contracts c JOIN properties p ON p.property_id = c.property_id
        WHERE c.tenant_id = $1 AND c.status::text IN ('draft', 'signed_by_owner', 'signed_by_tenant', 'fully_signed')
        ORDER BY (c.status::text = 'fully_signed') DESC, c.contract_id DESC LIMIT 1`,
      [req.user.user_id],
    );
    return res.status(200).json({ data: null, pending_lease: pending.rows[0] ?? null });
  }
  const c = rows[0];

  const paidRows = await pool.query(`SELECT DISTINCT to_char(payment_date, 'YYYY-MM') AS ym FROM payments WHERE contract_id = $1 AND status = 'paid'`, [c.contract_id]);
  const paid = new Set(paidRows.rows.map((r) => r.ym));

  const today = todayParts();
  let [y, m] = c.start_date.split("-").map(Number);
  const monthsDue = [];
  let paidMonths = 0;
  while (y < today.year || (y === today.year && m <= today.month)) {
    const ym = `${y}-${pad(m)}`;
    if (paid.has(ym)) paidMonths += 1; else monthsDue.push({ month: ym, amount: c.rate });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  const thisYm = `${today.year}-${pad(today.month)}`;
  const status = paid.has(thisYm) ? "paid" : today.day > DUE_DAY ? "overdue" : "due";

  return res.status(200).json({
    data: {
      property: { property_id: c.property_id, address: c.address, bedroom: c.bedroom, bathroom: c.bathroom, size_sqft: c.size_sqft },
      landlord: c.owner_name,
      lease: { status: c.status, contract_id: c.contract_id, rate: c.rate, deposit: c.deposit, start_date: c.start_date, end_date: c.end_date },
      current_month: { month: thisYm, status, due_by: `${thisYm}-${pad(DUE_DAY)}` },
      months_due: monthsDue, months_due_count: monthsDue.length,
      total_due: monthsDue.length * c.rate, months_paid: paidMonths,
    },
  });
};

module.exports = { getTenantDashboard };