const pool = require("../config/db.js");
const { notify } = require("../utils/notify.js");

// Shared SELECT: one dispute row with both parties and the property it
// concerns (via the contract). `$1` is always the signed-in user so each
// row can say whether it was filed BY them or AGAINST them.
const DISPUTE_SELECT = `
  SELECT d.dispute_id,
         d.complainant_id, c.name AS complainant_name,
         d.reported_user_id, r.name AS reported_user_name,
         d.contract_id, k.property_id, p.address AS property_address,
         d.reason, d.details, d.status, d.resolution_notes, d.created_at,
         (d.complainant_id = $1) AS created_by_me,
         (d.reported_user_id = $1) AS against_me
    FROM disputes d
    JOIN users c ON c.user_id = d.complainant_id
    JOIN users r ON r.user_id = d.reported_user_id
    LEFT JOIN contracts k ON k.contract_id = d.contract_id
    LEFT JOIN properties p ON p.property_id = k.property_id`;

const shape = (row) => ({
  dispute_id: row.dispute_id,
  complainant: { user_id: row.complainant_id, name: row.complainant_name },
  reported_user: { user_id: row.reported_user_id, name: row.reported_user_name },
  contract_id: row.contract_id,
  property_id: row.property_id,
  property_address: row.property_address,
  reason: row.reason,
  details: row.details,
  status: row.status,
  resolution_notes: row.resolution_notes,
  created_at: row.created_at,
  created_by_me: row.created_by_me,
  against_me: row.against_me,
});

// A failed notification must not undo the record the user just created.
const safeNotify = async (payload) => {
  try {
    await notify(payload);
  } catch (err) {
    console.error("dispute notify error: ", err);
  }
};

// GET /disputes  [auth] — disputes the signed-in user filed or is named in.
const listDisputes = async (req, res) => {
  try {
    const result = await pool.query(
      `${DISPUTE_SELECT}
        WHERE d.complainant_id = $1 OR d.reported_user_id = $1
        ORDER BY CASE WHEN d.status = 'open' THEN 0 ELSE 1 END, d.created_at DESC`,
      [req.user.user_id],
    );
    return res.status(200).json({ data: result.rows.map(shape) });
  } catch (err) {
    console.error("listDisputes error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch disputes" });
  }
};

// GET /disputes/:id  [auth] — one dispute; only its two parties or an admin.
const getDispute = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }
    const result = await pool.query(`${DISPUTE_SELECT} WHERE d.dispute_id = $2`, [req.user.user_id, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }
    const row = result.rows[0];

    let isAdmin = false;
    if (!row.created_by_me && !row.against_me) {
      const admin = await pool.query("SELECT is_admin FROM users WHERE user_id = $1", [req.user.user_id]);
      isAdmin = Boolean(admin.rows[0]?.is_admin);
      if (!isAdmin) {
        // 404 rather than 403 so ids can't be probed.
        return res.status(404).json({ success: false, message: "Dispute not found" });
      }
    }
    return res.status(200).json({ data: shape(row) });
  } catch (err) {
    console.error("getDispute error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch dispute" });
  }
};

// POST /disputes (also mounted at POST /admin/disputes)  [auth]
// A landlord or tenant files against the other party of one of THEIR
// active contracts, so the reported user is derived from the contract and
// can't be an arbitrary account. Only admins may file without a
// contract (the original admin-panel behaviour).
const createDispute = async (req, res) => {
  try {
    const complainantId = req.user.user_id;
    const { contract_id, reason, details } = req.body || {};
    let reportedUserId = req.body?.reported_user_id;

    if (!reason || !String(reason).trim() || !details || !String(details).trim()) {
      return res.status(400).json({ success: false, message: "reason and details are required" });
    }
    if (String(reason).trim().length > 255) {
      return res.status(400).json({ success: false, message: "reason must be 255 characters or fewer" });
    }

    let contractId = null;
    if (contract_id) {
      const contract = await pool.query(
        "SELECT contract_id, owner_id, tenant_id, status::text AS status FROM contracts WHERE contract_id = $1",
        [contract_id],
      );
      const c = contract.rows[0];
      if (!c || (c.owner_id !== complainantId && c.tenant_id !== complainantId)) {
        return res.status(404).json({ success: false, message: "Contract not found" });
      }
      if (c.status !== "active") {
        return res.status(422).json({ success: false, message: "Disputes can only be filed on an active lease" });
      }
      contractId = c.contract_id;
      reportedUserId = c.owner_id === complainantId ? c.tenant_id : c.owner_id;
    } else {
      const admin = await pool.query("SELECT is_admin FROM users WHERE user_id = $1", [complainantId]);
      if (!admin.rows[0]?.is_admin) {
        return res.status(400).json({ success: false, message: "contract_id is required" });
      }
      if (!reportedUserId) {
        return res.status(400).json({ success: false, message: "reported_user_id is required" });
      }
      if (Number(reportedUserId) === complainantId) {
        return res.status(422).json({ success: false, message: "Cannot file a dispute against yourself" });
      }
      const exists = await pool.query("SELECT user_id FROM users WHERE user_id = $1", [reportedUserId]);
      if (exists.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Reported user not found" });
      }
    }

    const result = await pool.query(
      `INSERT INTO disputes (complainant_id, reported_user_id, contract_id, reason, details, status)
       VALUES ($1, $2, $3, $4, $5, 'open')
       RETURNING dispute_id, status`,
      [complainantId, reportedUserId, contractId, String(reason).trim(), String(details).trim()],
    );
    const { dispute_id: disputeId } = result.rows[0];
    const link = `/disputes/${disputeId}`;
    const message = `Dispute #${disputeId}: ${String(reason).trim()}`;

    // The accused party, plus every admin (only admins can resolve).
    await safeNotify({
      userId: reportedUserId,
      type: "dispute_filed_against",
      title: "Dispute filed against you",
      message,
      linkUrl: link,
    });
    const admins = await pool.query(
      "SELECT user_id FROM users WHERE is_admin = TRUE AND user_id NOT IN ($1, $2)",
      [complainantId, reportedUserId],
    );
    await Promise.all(
      admins.rows.map((a) =>
        safeNotify({ userId: a.user_id, type: "dispute_filed", title: "New dispute filed", message, linkUrl: link }),
      ),
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createDispute error: ", err);
    return res.status(500).json({ success: false, message: "Failed to file dispute" });
  }
};

module.exports = { listDisputes, getDispute, createDispute };