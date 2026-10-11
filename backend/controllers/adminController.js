const pool = require("../config/db.js");
const { signFields, USER_SIGNED_FIELDS } = require("../utils/signFields.js");
const { notify } = require("../utils/notify.js");

// A user is "pending" when they have uploaded documents, are not verified, and
// no admin decision exists that is newer than their latest upload. Because
// decisions are kept in verification_reviews (never overwritten), a user can
// be rejected any number of times and each reason is preserved. Uploading new
// documents bumps documents_submitted_at, which makes them pending again.
const PENDING_FILTER = `
  u.documents_submitted_at IS NOT NULL
  AND u.is_verified = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM verification_reviews r
    WHERE r.user_id = u.user_id AND r.created_at >= u.documents_submitted_at
  )`;

// GET /admin/stats  [admin only]
const getAdminStats = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      usersResult,
      landlordsResult,
      listingsResult,
      contractsResult,
      turnoverResult,
      verificationsResult,
      disputesResult,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM users"),
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE is_landlord = TRUE AND is_verified = TRUE"),
      pool.query("SELECT COUNT(*)::int AS count FROM properties WHERE availability_status != $1", ["archived"]),
      pool.query("SELECT COUNT(*)::int AS count FROM contracts WHERE status = $1", ["active"]),
      pool.query(
        "SELECT COALESCE(SUM(amount), 0)::float AS total FROM payments WHERE status = $1 AND payment_date >= $2 AND payment_date < $3",
        ["paid", monthStart, monthEnd],
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM users u WHERE ${PENDING_FILTER}`),
      pool.query("SELECT COUNT(*)::int AS count FROM disputes WHERE status = $1", ["open"]),
    ]);

    return res.status(200).json({
      total_registered_users: usersResult.rows[0].count,
      verified_landlords: landlordsResult.rows[0].count,
      active_listings: listingsResult.rows[0].count,
      active_contracts: contractsResult.rows[0].count,
      monthly_turnover_bdt: turnoverResult.rows[0].total,
      pending_verifications: verificationsResult.rows[0].count,
      open_disputes: disputesResult.rows[0].count,
    });
  } catch (err) {
    console.error("getAdminStats error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch admin stats" });
  }
};

// GET /admin/verifications  [admin only]
const getVerificationQueue = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.name, u.contact_number, u.nid_photo_url, u.job_id_card_url, u.documents_submitted_at
       FROM users u
       WHERE ${PENDING_FILTER}
       ORDER BY u.documents_submitted_at ASC`,
    );

    const data = await Promise.all(
      result.rows.map(async (row) => {
        const signed = await signFields(row, USER_SIGNED_FIELDS);
        return {
          user_id: signed.user_id,
          name: signed.name,
          contact_number: signed.contact_number,
          nid_photo_url: signed.nid_photo_url,
          job_id_card_url: signed.job_id_card_url,
          submitted_at: signed.documents_submitted_at,
        };
      }),
    );

    return res.status(200).json({ data });
  } catch (err) {
    console.error("getVerificationQueue error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch verification queue" });
  }
};

// PATCH /admin/verifications/:id/approve  [admin only]
const approveVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE users SET is_verified = TRUE WHERE user_id = $1 RETURNING user_id, is_verified",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }

    await pool.query(
      "INSERT INTO verification_reviews (user_id, reviewed_by, decision) VALUES ($1, $2, $3)",
      [id, req.user.user_id, "approved"],
    );

    await notify({
      userId: id,
      type: "verification_approved",
      title: "Verification approved",
      message: "Your identity documents have been verified.",
      linkUrl: "/users/me",
    });

    return res.status(200).json({
      user_id: result.rows[0].user_id,
      is_verified: result.rows[0].is_verified,
      status: "approved",
    });
  } catch (err) {
    console.error("approveVerification error: ", err);
    return res.status(500).json({ success: false, message: "Failed to approve verification" });
  }
};

// PATCH /admin/verifications/:id/reject  [admin only]
const rejectVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body || {};

    if (!rejection_reason) {
      return res.status(422).json({ success: false, message: "rejection_reason is required" });
    }

    const result = await pool.query(
      "UPDATE users SET is_verified = FALSE WHERE user_id = $1 RETURNING user_id, is_verified",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }

    await pool.query(
      "INSERT INTO verification_reviews (user_id, reviewed_by, decision, reason) VALUES ($1, $2, $3, $4)",
      [id, req.user.user_id, "rejected", rejection_reason],
    );

    await notify({
      userId: id,
      type: "verification_rejected",
      title: "Verification rejected",
      message: rejection_reason,
      linkUrl: "/users/me/documents",
    });

    return res.status(200).json({
      user_id: result.rows[0].user_id,
      is_verified: result.rows[0].is_verified,
      status: "rejected",
    });
  } catch (err) {
    console.error("rejectVerification error: ", err);
    return res.status(500).json({ success: false, message: "Failed to reject verification" });
  }
};

module.exports = { getAdminStats, getVerificationQueue, approveVerification, rejectVerification };