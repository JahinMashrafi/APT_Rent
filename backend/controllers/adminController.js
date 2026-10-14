const bcrypt = require("bcrypt"); // Change to require("bcryptjs") if using bcryptjs
const pool = require("../config/db.js");
const { signFields, USER_SIGNED_FIELDS } = require("../utils/signFields.js");
const { notify } = require("../utils/notify.js");

// Uploading new documents bumps documents_submitted_at, which makes an
// unverified user pending again.
const PENDING_FILTER = `
  u.documents_submitted_at IS NOT NULL
  AND u.is_verified = FALSE`;

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
      pool.query("SELECT COUNT(*)::int AS count FROM properties WHERE availability_status != \$1", ["archived"]),
      pool.query("SELECT COUNT(*)::int AS count FROM contracts WHERE status = \$1", ["active"]),
      pool.query(
        "SELECT COALESCE(SUM(amount), 0)::float AS total FROM payments WHERE status = \$1 AND payment_date >= \$2 AND payment_date < \$3",
        ["paid", monthStart, monthEnd],
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM users u WHERE ${PENDING_FILTER}`),
      pool.query("SELECT COUNT(*)::int AS count FROM disputes WHERE status = \$1", ["open"]),
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
      "UPDATE users SET is_verified = TRUE WHERE user_id = \$1 RETURNING user_id, is_verified",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }

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
      "UPDATE users SET is_verified = FALSE, verification_rejection_reason = \$2 WHERE user_id = \$1 RETURNING user_id, is_verified",
      [id, rejection_reason],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }

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

// GET /admin/users  [admin only]
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.user_id,
         u.name,
         u.email,
         u.contact_number,
         u.address,
         u.occupation,
         u.workplace_name,
         u.is_tenant,
         u.is_landlord,
         u.is_admin,
         u.is_verified,
         u.created_at,
         COUNT(d.dispute_id) FILTER (WHERE d.status = 'open')::int AS reports,
         (
           SELECT d2.dispute_id
           FROM disputes d2
           WHERE d2.reported_user_id = u.user_id AND d2.status = 'open'
           ORDER BY d2.created_at DESC
           LIMIT 1
         ) AS latest_dispute_id,
         (
           SELECT d2.reason
           FROM disputes d2
           WHERE d2.reported_user_id = u.user_id AND d2.status = 'open'
           ORDER BY d2.created_at DESC
           LIMIT 1
         ) AS latest_dispute_reason,
         (
           SELECT d2.details
           FROM disputes d2
           WHERE d2.reported_user_id = u.user_id AND d2.status = 'open'
           ORDER BY d2.created_at DESC
           LIMIT 1
         ) AS latest_dispute_details
       FROM users u
       LEFT JOIN disputes d ON d.reported_user_id = u.user_id
       GROUP BY u.user_id
       ORDER BY reports DESC, u.created_at DESC`,
    );

    return res.status(200).json({
      data: result.rows.map((user) => ({ ...user, is_banned: false })),
    });
  } catch (err) {
    console.error("getUsers error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// POST /admin/users  [admin only]
const createUserByAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      contact_number,
      address,
      occupation,
      workplace_name,
      is_tenant = false,
      is_landlord = false,
      is_admin = false,
      is_verified = false,
    } = req.body || {};

    if (!name || !email || !password || !contact_number) {
      return res.status(400).json({
        success: false,
        message: "name, email, password, and contact_number are required",
      });
    }

    const existing = await pool.query("SELECT 1 FROM users WHERE email = \$1", [
      email.trim().toLowerCase(),
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Note: If your users table uses `password` instead of `password_hash`, update the column name below
    const result = await pool.query(
      `INSERT INTO users (
         name,
         email,
         password_hash,
         contact_number,
         address,
         occupation,
         workplace_name,
         is_tenant,
         is_landlord,
         is_admin,
         is_verified
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING
         user_id,
         name,
         email,
         contact_number,
         address,
         occupation,
         workplace_name,
         is_tenant,
         is_landlord,
         is_admin,
         is_verified,
         created_at`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        hashedPassword,
        contact_number.trim(),
        address?.trim() || null,
        occupation?.trim() || null,
        workplace_name?.trim() || null,
        Boolean(is_tenant),
        Boolean(is_landlord),
        Boolean(is_admin),
        Boolean(is_verified || is_admin),
      ],
    );

    return res.status(201).json({
      user: { ...result.rows[0], is_banned: false, reports: 0 },
    });
  } catch (err) {
    console.error("createUserByAdmin error: ", err);
    return res.status(500).json({ success: false, message: "Failed to create user account" });
  }
};

// PATCH /admin/users/:id/admin  [admin only]
const toggleAdminRole = async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) === Number(req.user.user_id)) {
      return res.status(422).json({
        success: false,
        message: "You cannot revoke your own admin privileges",
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET is_admin = NOT COALESCE(is_admin, FALSE)
       WHERE user_id = $1
       RETURNING user_id, is_admin`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("toggleAdminRole error: ", err);
    return res.status(500).json({ success: false, message: "Failed to update admin status" });
  }
};

// PATCH /admin/users/:id/ban  [admin only]
const toggleBanUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) === Number(req.user.user_id)) {
      return res.status(422).json({
        success: false,
        message: "You cannot ban your own admin account",
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET is_banned = NOT COALESCE(is_banned, FALSE)
       WHERE user_id = $1
       RETURNING user_id, is_banned`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }

    return res.status(200).json({
      user_id: result.rows[0].user_id,
      is_banned: result.rows[0].is_banned,
      status: result.rows[0].is_banned ? "banned" : "active",
    });
  } catch (err) {
    console.error("toggleBanUser error: ", err);
    return res.status(500).json({ success: false, message: "Failed to update user ban status" });
  }
};

// GET /admin/disputes  [admin only]
const getDisputes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         d.dispute_id,
         d.complainant_id,
         c.name AS complainant_name,
         c.contact_number AS complainant_phone,
         d.reported_user_id,
         r.name AS reported_user_name,
         r.contact_number AS reported_user_phone,
         d.contract_id,
         d.reason,
         d.details,
         d.status,
         d.resolution_notes,
         d.created_at
       FROM disputes d
       JOIN users c ON c.user_id = d.complainant_id
       JOIN users r ON r.user_id = d.reported_user_id
       ORDER BY 
         CASE WHEN d.status = 'open' THEN 0 ELSE 1 END,
         d.created_at DESC`,
    );

    return res.status(200).json({ data: result.rows });
  } catch (err) {
    console.error("getDisputes error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch disputes" });
  }
};

// POST /admin/disputes  [auth required]
const createDispute = async (req, res) => {
  try {
    const { reported_user_id, contract_id, reason, details } = req.body || {};

    if (!reported_user_id || !reason || !details) {
      return res.status(400).json({
        success: false,
        message: "reported_user_id, reason, and details are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO disputes (complainant_id, reported_user_id, contract_id, reason, details, status)
       VALUES ($1, $2, $3, $4, $5, 'open')
       RETURNING dispute_id, status`,
      [req.user.user_id, reported_user_id, contract_id || null, reason.trim(), details.trim()],
    );

    return res.status(201).json(result.rows[0]);
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

    if (!resolution_notes || !resolution_notes.trim()) {
      return res.status(422).json({
        success: false,
        message: "resolution_notes is required",
      });
    }

    const result = await pool.query(
      `UPDATE disputes
       SET status = 'resolved', resolution_notes = $1
       WHERE dispute_id = $2
       RETURNING dispute_id, complainant_id, reported_user_id, status`,
      [resolution_notes.trim(), id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Dispute with id ${id} not found`,
      });
    }

    const dispute = result.rows[0];

    await Promise.all([
      notify({
        userId: dispute.complainant_id,
        type: "dispute_resolved",
        title: "Dispute resolved",
        message: resolution_notes.trim(),
        linkUrl: "/users/me",
      }),
      notify({
        userId: dispute.reported_user_id,
        type: "dispute_resolved",
        title: "Dispute resolved",
        message: resolution_notes.trim(),
        linkUrl: "/users/me",
      }),
    ]);

    return res.status(200).json({
      dispute_id: dispute.dispute_id,
      status: dispute.status,
    });
  } catch (err) {
    console.error("resolveDispute error: ", err);
    return res.status(500).json({ success: false, message: "Failed to resolve dispute" });
  }
};

module.exports = {
  getAdminStats,
  getVerificationQueue,
  approveVerification,
  rejectVerification,
  getUsers,
  createUserByAdmin,
  toggleAdminRole,
  toggleBanUser,
  getDisputes,
  createDispute,
  resolveDispute,
};