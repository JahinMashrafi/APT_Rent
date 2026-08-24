const pool = require("../config/db.js");

// Fields updatable via this API. password_hash is intentionally excluded —
// credential changes should go through a dedicated auth endpoint with bcrypt.
const UPDATABLE_FIELDS = [
  "name",
  "role",
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
];

// GET /api/users
// GET /api/users?role=tenant
const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = "SELECT * FROM users";
    const params = [];

    if (role) {
      params.push(role);
      query += ` WHERE role = $${params.length}`;
    }
    query += " ORDER BY user_id ASC";

    const result = await pool.query(query, params);
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error("Get users error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM users WHERE user_id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Get user by id error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch user" });
  }
};

// PUT/PATCH /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const field of UPDATABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update",
        allowedFields: UPDATABLE_FIELDS,
      });
    }

    values.push(id);
    const query = `
      UPDATE users
      SET ${setClauses.join(", ")}
      WHERE user_id = $${paramIndex}
      RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }

    return res.status(200).json({ success: true, message: "User updated successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Update user error: ", err);

    if (err.code === "23505") {
      return res.status(409).json({ success: false, message: "Email or contact number already in use" });
    }
    if (err.code === "23514") {
      return res.status(400).json({ success: false, message: "Occupation fields violate schema constraint" });
    }
    if (err.code === "22P02") {
      return res.status(400).json({ success: false, message: "Invalid value for role/occupation" });
    }

    return res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

// DELETE /api/users/:id
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

module.exports = { getUsers, getUserById, updateUser, deleteUser };