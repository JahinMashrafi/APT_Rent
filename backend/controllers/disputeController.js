const pool = require("../config/db.js");
const { notify } = require("../utils/notify.js");

// POST /admin/disputes  [auth required — either party can file]
const createDispute = async (req, res) => {
  try {
    const complainantId = req.user.user_id;
    const { reported_user_id, contract_id, reason, details } = req.body || {};

    if (!reported_user_id || !reason || !details) {
      return res.status(422).json({ success: false, message: "reported_user_id, reason, and details are required" });
    }
    if (Number(reported_user_id) === complainantId) {
      return res.status(422).json({ success: false, message: "Cannot file a dispute against yourself" });
    }

    const reportedCheck = await pool.query("SELECT user_id FROM users WHERE user_id = $1", [reported_user_id]);
    if (reportedCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Reported user not found" });
    }

    const result = await pool.query(
      `INSERT INTO disputes (complainant_id, reported_user_id, contract_id, reason, details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING dispute_id, status`,
      [complainantId, reported_user_id, contract_id || null, reason, details],
    );

    // No single "the admin" account exists, so notify every is_admin user.
    const admins = await pool.query("SELECT user_id FROM users WHERE is_admin = TRUE");
    await Promise.all(
      admins.rows.map((admin) =>
        notify({
          userId: admin.user_id,
          type: "dispute_filed",
          title: "New dispute filed",
          message: `Dispute #${result.rows[0].dispute_id}: ${reason}`,
          linkUrl: `/admin/disputes/${result.rows[0].dispute_id}`,
        }),
      ),
    );

    return res.status(201).json({
      dispute_id: result.rows[0].dispute_id,
      status: result.rows[0].status,
    });
  } catch (err) {
    console.error("createDispute error: ", err);
    return res.status(500).json({ success: false, message: "Failed to file dispute" });
  }
};

// PATCH /admin/disputes/:id/resolve  [admin only]
const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body || {};

    if (!resolution_notes) {
      return res.status(422).json({ success: false, message: "resolution_notes is required" });
    }

    const result = await pool.query(
      `UPDATE disputes SET status = $1, resolution_notes = $2
       WHERE dispute_id = $3
       RETURNING dispute_id, status, complainant_id, reported_user_id`,
      ["resolved", resolution_notes, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }
    const dispute = result.rows[0];

    await Promise.all(
      [dispute.complainant_id, dispute.reported_user_id].map((userId) =>
        notify({
          userId,
          type: "dispute_resolved",
          title: "Dispute resolved",
          message: resolution_notes,
          linkUrl: `/disputes/${id}`,
        }),
      ),
    );

    return res.status(200).json({ dispute_id: dispute.dispute_id, status: dispute.status });
  } catch (err) {
    console.error("resolveDispute error: ", err);
    return res.status(500).json({ success: false, message: "Failed to resolve dispute" });
  }
};

module.exports = { createDispute, resolveDispute };