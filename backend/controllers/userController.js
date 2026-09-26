const pool = require("../config/db.js");
const { uploadToBucket } = require("../utils/storage.js");
const { signFields, USER_SIGNED_FIELDS } = require("../utils/signFields.js");

// ---- Admin-facing list/update/delete ----

const UPDATABLE_FIELDS = [
  "name",
  "email",
  "contact_number",
  "profile_picture_url",
  "nid_photo_url",
  "address",
  "occupation",
  "institution_name",
  "student_id_card_url",
  "workplace_name",
  "job_id_card_url",
  "trade_license_url",
  "is_verified",
  "is_tenant",
  "is_landlord",
];

// GET /api/users
// GET /api/users?role=tenant|landlord|admin (maps to boolean columns)
const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = "SELECT * FROM users";
    const params = [];

    if (role === "tenant") query += " WHERE is_tenant = TRUE";
    else if (role === "landlord") query += " WHERE is_landlord = TRUE";
    else if (role === "admin") query += " WHERE is_admin = TRUE";

    query += " ORDER BY user_id ASC";
    const result = await pool.query(query, params);
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error("Get users error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const setClauses = [];
    const values = [];
    let i = 1;

    for (const field of UPDATABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        setClauses.push(`${field} = $${i}`);
        values.push(body[field]);
        i++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields provided to update", allowedFields: UPDATABLE_FIELDS });
    }

    values.push(id);
    const query = `UPDATE users SET ${setClauses.join(", ")} WHERE user_id = $${i} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }
    return res.status(200).json({ success: true, message: "User updated successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Update user error: ", err);
    if (err.code === "23505") return res.status(409).json({ success: false, message: "Email or contact number already in use" });
    if (err.code === "22P02") return res.status(400).json({ success: false, message: "Invalid field value" });
    return res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM users WHERE user_id = $1 RETURNING user_id, name, email",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }
    return res.status(200).json({ success: true, message: "User deleted successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Delete user error: ", err);
    return res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

// ---- Authentication & User Identity spec endpoints ----

// GET /users/me
const getMe = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await pool.query(
      `SELECT user_id, name, email, contact_number, address, occupation,
              institution_name, workplace_name, profile_picture_url, nid_photo_url,
              student_id_card_url, job_id_card_url, trade_license_url,
              is_verified, is_tenant, is_landlord, is_admin
       FROM users WHERE user_id = $1`,
      [userId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = await signFields(result.rows[0], USER_SIGNED_FIELDS);
    return res.status(200).json(user);
  } catch (err) {
    console.error("getMe error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch current user" });
  }
};

// PATCH /users/me
const ME_UPDATABLE_FIELDS = [
  "name",
  "contact_number",
  "address",
  "occupation",
  "institution_name",
  "workplace_name",
  "is_tenant",
  "is_landlord",
];

const updateMe = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const body = req.body || {};
    const setClauses = [];
    const values = [];
    let i = 1;

    for (const field of ME_UPDATABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        setClauses.push(`${field} = $${i}`);
        values.push(body[field]);
        i++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields provided to update", allowedFields: ME_UPDATABLE_FIELDS });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users SET ${setClauses.join(", ")}
      WHERE user_id = $${i}
      RETURNING user_id, name, contact_number, is_tenant, is_landlord, updated_at`;

    const result = await pool.query(query, values);
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("updateMe error: ", err);
    if (err.code === "23505") return res.status(409).json({ success: false, message: "Contact number already in use" });
    return res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

// POST /users/me/documents  (multipart/form-data)
const uploadDocuments = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const files = req.files || {};
    const updates = {};

    const jobs = [
      ["nid_photo", "nid_photo_url"],
      ["student_id_card", "student_id_card_url"],
      ["job_id_card", "job_id_card_url"],
      ["trade_license", "trade_license_url"],
    ];

    for (const [field, column] of jobs) {
      const file = files[field]?.[0];
      if (!file) continue;
      const ext = file.originalname.split(".").pop();
      const path = `users/${userId}/${field}-${Date.now()}.${ext}`;
      const { path: storedPath } = await uploadToBucket("verification-docs", path, file.buffer, file.mimetype);
      updates[column] = storedPath; // store path; verification-docs is private
    }

    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "No recognized document files uploaded" });
    }

    const setClauses = fields.map((f, idx) => `${f} = $${idx + 1}`);
    const values = fields.map((f) => updates[f]);
    values.push(userId);

    await pool.query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE user_id = $${fields.length + 1}`,
      values,
    );

    return res.status(200).json({
      message: "Documents uploaded successfully. Under admin review.",
      ...updates,
    });
  } catch (err) {
    console.error("uploadDocuments error: ", err);
    return res.status(500).json({ success: false, message: "Failed to upload documents" });
  }
};

// GET /users/:id  — public profile
const getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await pool.query(
      `SELECT user_id, name, profile_picture_url, is_verified, is_landlord, created_at
       FROM users WHERE user_id = $1`,
      [id],
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }
    const user = userResult.rows[0];

    const reviewStats = await pool.query(
      `SELECT COALESCE(AVG(rating), 0)::float AS average_rating, COUNT(*)::int AS total_reviews
       FROM reviews WHERE reviewed_user_id = $1`,
      [id],
    );
    const { average_rating, total_reviews } = reviewStats.rows[0];

    return res.status(200).json({
      user_id: user.user_id,
      name: user.name,
      profile_picture_url: user.profile_picture_url, // avatars bucket is public — stored as-is
      is_verified: user.is_verified,
      is_landlord: user.is_landlord,
      member_since: user.created_at,
      average_rating: Number(average_rating.toFixed(2)),
      total_reviews,
    });
  } catch (err) {
    console.error("getPublicProfile error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch user profile" });
  }
};

module.exports = {
  getUsers,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
  uploadDocuments,
  getPublicProfile,
};