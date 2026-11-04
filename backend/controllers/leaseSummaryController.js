const pool = require("../config/db.js");
const { notify } = require("../utils/notify.js");
const { buildContractPdfBuffer } = require("../utils/contractPdf.js");
const { uploadToBucket } = require("../utils/storage.js");
const { addMonths, monthsBetween, buildDefaultTerms, todayYmd, formatDuration } = require("../utils/leaseDefaults.js");

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const bad = (res, message) => res.status(400).json({ success: false, message });

const SUMMARY_SQL = `
  SELECT c.contract_id, c.owner_id, c.tenant_id, c.property_id, c.status::text AS status,
         c.negotiation_status, c.rate::float AS rate, c.deposit::float AS deposit,
         c.start_date::text AS start_date, c.end_date::text AS end_date, c.terms_and_conditions,
         t.name AS tenant_name, t.email AS tenant_email,
         o.name AS owner_name, p.address AS property_address
    FROM contracts c
    JOIN users t ON t.user_id = c.tenant_id
    JOIN users o ON o.user_id = c.owner_id
    JOIN properties p ON p.property_id = c.property_id`;

const shape = (r, viewerId) => ({
  contract_id: r.contract_id,
  property_id: r.property_id,
  property_address: r.property_address,
  status: r.status,
  negotiation_status: r.negotiation_status,
  landlord_name: r.owner_name,
  tenant_name: r.tenant_name,
  tenant_email: r.tenant_email,
  rate: r.rate,
  deposit: r.deposit,
  start_date: r.start_date,
  end_date: r.end_date,
  duration_months: monthsBetween(r.start_date, r.end_date),
  terms_and_conditions: r.terms_and_conditions,
  // The landlord can edit until the lease is signed off; after that the signed text must not change.
  can_edit: Number(r.owner_id) === Number(viewerId) && r.status === "draft",
});

// GET /lease-summary/default-terms?start_date&end_date&deposit  [landlord]
const defaultTerms = async (req, res) => {
  const { start_date, end_date, deposit } = req.query;
  if (!YMD_RE.test(start_date || "") || !YMD_RE.test(end_date || "")) return bad(res, "start_date and end_date must be YYYY-MM-DD.");
  return res.status(200).json({ terms_and_conditions: buildDefaultTerms({ startDate: start_date, endDate: end_date, deposit: Number(deposit) || 0 }) });
};

// GET /lease-summary/preview?property_id&tenant_id  [landlord] — values pulled from the database for a NEW offer
const previewSummary = async (req, res) => {
  const propertyId = Number(req.query.property_id);
  const tenantId = Number(req.query.tenant_id);
  if (!Number.isInteger(propertyId) || !Number.isInteger(tenantId)) return bad(res, "property_id and tenant_id are required.");

  const { rows } = await pool.query(
    `SELECT p.property_id, p.owner_id, p.address, p.rate::float AS rate, COALESCE(p.deposit, 0)::float AS deposit,
            t.user_id AS tenant_id, t.name AS tenant_name, t.email AS tenant_email
       FROM properties p, users t
      WHERE p.property_id = $1 AND t.user_id = $2 AND p.availability_status::text <> 'archived'`,
    [propertyId, tenantId],
  );
  if (rows.length === 0) return res.status(404).json({ success: false, message: "Property or tenant not found." });
  const r = rows[0];
  if (r.owner_id !== req.user.user_id) return res.status(403).json({ success: false, message: "You do not own this property." });

  const open = await pool.query(
    `SELECT contract_id, status::text AS status FROM contracts
      WHERE property_id = $1 AND tenant_id = $2 AND status::text NOT IN ('terminated', 'completed')
      ORDER BY contract_id DESC LIMIT 1`,
    [propertyId, tenantId],
  );

  const start = todayYmd();
  const end = addMonths(start, 12);
  return res.status(200).json({
    data: {
      existing: open.rows[0] ?? null,
      summary: {
        property_id: r.property_id, property_address: r.address,
        tenant_id: r.tenant_id, tenant_name: r.tenant_name, tenant_email: r.tenant_email,
        rate: r.rate, deposit: r.deposit, start_date: start, end_date: end, duration_months: 12,
        terms_and_conditions: buildDefaultTerms({ startDate: start, endDate: end, deposit: r.deposit }),
      },
    },
  });
};

// GET /lease-summary/:id  [either party] — the tenant-facing summary is this same record
const getSummary = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return bad(res, "Contract id must be a number.");
  const { rows } = await pool.query(`${SUMMARY_SQL} WHERE c.contract_id = $1`, [id]);
  if (rows.length === 0) return res.status(404).json({ success: false, message: "Contract not found." });
  const r = rows[0];
  const uid = req.user.user_id;
  if (r.owner_id !== uid && r.tenant_id !== uid && !req.user.is_admin) return res.status(403).json({ success: false, message: "You are not part of this contract." });
  return res.status(200).json({ data: shape(r, uid) });
};

// PATCH /lease-summary/:id  [landlord, lease still a draft]
const updateSummary = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return bad(res, "Contract id must be a number.");
  const body = req.body || {};

  const found = await pool.query(`${SUMMARY_SQL} WHERE c.contract_id = $1`, [id]);
  if (found.rows.length === 0) return res.status(404).json({ success: false, message: "Contract not found." });
  const cur = found.rows[0];
  if (cur.owner_id !== req.user.user_id) return res.status(403).json({ success: false, message: "Only the landlord can edit the lease summary." });
  if (cur.status !== "draft") return res.status(409).json({ success: false, message: `The summary can no longer be edited (lease is ${cur.status}).` });

  const next = {
    rate: body.rate !== undefined ? Number(body.rate) : cur.rate,
    deposit: body.deposit !== undefined ? Number(body.deposit) : cur.deposit,
    start_date: body.start_date ?? cur.start_date,
    end_date: body.end_date ?? cur.end_date,
    terms: body.terms_and_conditions !== undefined ? String(body.terms_and_conditions) : cur.terms_and_conditions,
  };
  // A new duration (without an explicit end date) moves the end date.
  if (body.duration_months !== undefined && body.end_date === undefined) {
    const months = Number(body.duration_months);
    if (!Number.isInteger(months) || months < 1 || months > 120) return bad(res, "Lease duration must be 1–120 months.");
    next.end_date = addMonths(next.start_date, months);
  }

  if (!Number.isFinite(next.rate) || next.rate <= 0) return bad(res, "Monthly rent must be greater than 0.");
  if (!Number.isFinite(next.deposit) || next.deposit < 0) return bad(res, "Security deposit cannot be negative.");
  if (!YMD_RE.test(next.start_date) || !YMD_RE.test(next.end_date)) return bad(res, "Dates must be YYYY-MM-DD.");
  if (next.end_date <= next.start_date) return bad(res, "The end date must be after the start date.");
  if (String(next.terms || "").length > 6000) return bad(res, "Terms and conditions are too long (max 6000 characters).");

  // If the landlord never changed the wording, keep it in step with the new dates/deposit.
  // If they did change it, their text is kept exactly as written.
  const oldDefault = buildDefaultTerms({ startDate: cur.start_date, endDate: cur.end_date, deposit: cur.deposit });
  const untouched = !cur.terms_and_conditions || cur.terms_and_conditions.trim() === oldDefault.trim();
  const sentTermsAreOldDefault = body.terms_and_conditions === undefined || String(body.terms_and_conditions).trim() === oldDefault.trim();
  if (untouched && sentTermsAreOldDefault) next.terms = buildDefaultTerms({ startDate: next.start_date, endDate: next.end_date, deposit: next.deposit });
  if (!String(next.terms || "").trim()) next.terms = buildDefaultTerms({ startDate: next.start_date, endDate: next.end_date, deposit: next.deposit });

  const upd = await pool.query(
    `UPDATE contracts
        SET rate = $1, deposit = $2, start_date = $3::date, end_date = $4::date, terms_and_conditions = $5,
            negotiation_status = 'owner_proposed', updated_at = NOW()
      WHERE contract_id = $6 AND status = 'draft'`,
    [next.rate, next.deposit, next.start_date, next.end_date, next.terms, id],
  );
  if (upd.rowCount === 0) return res.status(409).json({ success: false, message: "The lease changed while you were editing. Refresh and try again." });

  // The lease document must reflect the saved values.
  try {
    const pdf = await buildContractPdfBuffer({
      landlordName: cur.owner_name, tenantName: cur.tenant_name, tenantEmail: cur.tenant_email,
      propertyAddress: cur.property_address, rate: next.rate, depositAmount: next.deposit,
      startDate: next.start_date, endDate: next.end_date, contractId: id, termsAndConditions: next.terms,
      durationLabel: formatDuration(monthsBetween(next.start_date, next.end_date)),
    });
    const { url } = await uploadToBucket("contract-pdfs", `contracts/${id}.pdf`, pdf, "application/pdf");
    await pool.query("UPDATE contracts SET contract_pdf_url = $1 WHERE contract_id = $2", [url, id]);
  } catch (err) {
    console.error("Lease PDF regeneration failed (summary still saved): ", err.message);
  }

  await notify({
    userId: cur.tenant_id, type: "contract_negotiation", title: "Lease summary updated",
    message: `The landlord updated the lease summary for ${cur.property_address}. Please review it.`, linkUrl: "/contracts",
  }).catch(() => {});

  const fresh = await pool.query(`${SUMMARY_SQL} WHERE c.contract_id = $1`, [id]);
  return res.status(200).json({ data: shape(fresh.rows[0], req.user.user_id) });
};

module.exports = { defaultTerms, previewSummary, getSummary, updateSummary };