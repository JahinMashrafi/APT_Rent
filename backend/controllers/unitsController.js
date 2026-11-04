const pool = require("../config/db.js");

const pad = (n) => String(n).padStart(2, "0");
const currentMonth = () => {
  const make = (tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  let parts;
  try { parts = make(process.env.APP_TIMEZONE || "Asia/Dhaka"); } catch { parts = make("Asia/Dhaka"); }
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { ym: `${get("year")}-${pad(get("month"))}`, day: get("day") };
};

// GET /units  [landlord]
// A unit is OCCUPIED exactly when it has an ACTIVE lease — the same rule the landlord dashboard and the
// tenant dashboard use. A lease that is signed but not yet activated shows on the vacant card as "pending".
const getUnits = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.property_id, p.address, p.rate::float AS listing_rate, p.availability_status::text AS availability_status,
            p.is_hidden, p.floor, p.total_floors,
            a.contract_id AS active_id, a.rate::float AS lease_rate, a.end_date::text AS end_date,
            at.name AS tenant_name, at.user_id AS tenant_id, at.contact_number AS tenant_phone,
            at.profile_picture_url AS tenant_picture,
            q.contract_id AS pending_id, q.status::text AS pending_status, qt.name AS pending_tenant
       FROM properties p
       LEFT JOIN LATERAL (
         SELECT * FROM contracts c WHERE c.property_id = p.property_id AND c.status::text = 'active'
          ORDER BY c.start_date DESC LIMIT 1
       ) a ON TRUE
       LEFT JOIN users at ON at.user_id = a.tenant_id
       LEFT JOIN LATERAL (
         SELECT * FROM contracts c WHERE c.property_id = p.property_id
            AND c.status::text IN ('fully_signed', 'signed_by_owner', 'signed_by_tenant', 'draft')
          ORDER BY (c.status::text = 'fully_signed') DESC, c.contract_id DESC LIMIT 1
       ) q ON TRUE
       LEFT JOIN users qt ON qt.user_id = q.tenant_id
      WHERE p.owner_id = $1 AND p.availability_status::text <> 'archived'
      ORDER BY p.property_id`,
    [req.user.user_id],
  );

  const ids = rows.filter((r) => r.active_id).map((r) => r.active_id);
  const paid = new Set();
  const { ym, day } = currentMonth();
  if (ids.length) {
    const pay = await pool.query(
      `SELECT DISTINCT contract_id FROM payments
        WHERE contract_id = ANY($1::int[]) AND status = 'paid' AND to_char(payment_date, 'YYYY-MM') = $2`,
      [ids, ym],
    );
    pay.rows.forEach((r) => paid.add(r.contract_id));
  }

  const occupied = [];
  const vacant = [];
  for (const r of rows) {
    const base = { property_id: r.property_id, address: r.address, floor: r.floor, total_floors: r.total_floors };
    if (r.active_id) {
      occupied.push({
        ...base, availability_status: "rented",
        tenant: { user_id: r.tenant_id, name: r.tenant_name, phone: r.tenant_phone, profile_picture_url: r.tenant_picture },
        contract_id: r.active_id, contract_status: "active",
        rent: r.lease_rate ?? r.listing_rate, lease_end: r.end_date,
        rent_status: paid.has(r.active_id) ? "paid" : day > 5 ? "overdue" : "due",
      });
    } else {
      const status = r.availability_status === "rented" ? "available" : r.availability_status; // no active lease -> not occupied
      vacant.push({
        ...base, availability_status: status, rent: r.listing_rate,
        listing_status: r.is_hidden ? "hidden" : status === "available" ? "listed" : status,
        pending_lease: r.pending_id ? { contract_id: r.pending_id, status: r.pending_status, tenant_name: r.pending_tenant } : null,
      });
    }
  }
  return res.status(200).json({ data: { occupied, vacant } });
};

module.exports = { getUnits };