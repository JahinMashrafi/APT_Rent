const pool = require("../config/db.js");
const { monthLabel } = require("../utils/dateFormat.js");

// GET /history  [auth required] — landlord sees their own, tenant sees their own
const getHistory = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const column = req.user.is_landlord ? "owner_id" : "tenant_id";

    const result = await pool.query(
      `SELECT history_id, contract_id, property_id, billing_month, due_amount,
              payment_status, deposit_amount, deposit_paid_at, deadline
       FROM history
       WHERE ${column} = $1
       ORDER BY created_at DESC`,
      [userId],
    );

    const data = result.rows.map((row) => ({
      history_id: row.history_id,
      contract_id: row.contract_id,
      property_id: row.property_id,
      month: row.billing_month ? monthLabel(new Date(row.billing_month)) : null,
      due_amount: row.due_amount,
      payment_status: row.payment_status,
      deposit_amount: row.deposit_amount,
      deposit_paid_at: row.deposit_paid_at,
      deadline: row.deadline,
    }));

    return res.status(200).json({ data });
  } catch (err) {
    console.error("getHistory error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch history" });
  }
};

module.exports = { getHistory };