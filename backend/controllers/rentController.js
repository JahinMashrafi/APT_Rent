const pool = require("../config/db.js");
const { notify } = require("../utils/notify.js");
const { monthLabel, isoDate } = require("../utils/dateFormat.js");

// GET /rent/current  [tenant only]
const getCurrentRent = async (req, res) => {
  try {
    const tenantId = req.user.user_id;

    const contractResult = await pool.query(
      `SELECT contract_id, property_id, rate, start_date
       FROM contracts
       WHERE tenant_id = $1 AND status = 'active'
       ORDER BY start_date DESC
       LIMIT 1`,
      [tenantId],
    );
    if (contractResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "No active lease found for this tenant" });
    }
    const contract = contractResult.rows[0];

    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const windowEnd = new Date(now.getFullYear(), now.getMonth(), 5);

    const paymentCheck = await pool.query(
      `SELECT payment_id FROM payments
       WHERE contract_id = $1 AND status = 'paid'
         AND payment_date >= $2 AND payment_date < $3
       LIMIT 1`,
      [contract.contract_id, windowStart, new Date(now.getFullYear(), now.getMonth() + 1, 1)],
    );
    const isPaid = paymentCheck.rows.length > 0;
    const isOverdue = !isPaid && now > windowEnd;

    return res.status(200).json({
      contract_id: contract.contract_id,
      property_id: contract.property_id,
      billing_month: monthLabel(now),
      rate: contract.rate,
      due_amount: isPaid ? 0 : contract.rate,
      payment_window_start: isoDate(windowStart),
      payment_window_end: isoDate(windowEnd),
      status: isPaid ? "paid" : "due",
      is_overdue: isOverdue,
    });
  } catch (err) {
    console.error("getCurrentRent error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch current rent status" });
  }
};

// POST /rent/cash-schedule  [tenant only]
const scheduleCashPickup = async (req, res) => {
  try {
    const tenantId = req.user.user_id;
    const { contract_id, collection_date, time_preference, notes } = req.body || {};

    if (!contract_id || !collection_date || !time_preference) {
      return res.status(422).json({ success: false, message: "contract_id, collection_date, and time_preference are required" });
    }
    const allowedPrefs = ["morning", "afternoon", "evening"];
    if (!allowedPrefs.includes(time_preference)) {
      return res.status(422).json({ success: false, message: `time_preference must be one of: ${allowedPrefs.join(", ")}` });
    }
    const day = new Date(`${collection_date}T00:00:00`).getDate();
    if (day < 1 || day > 5) {
      return res.status(422).json({ success: false, message: "Cash pickup date must fall between the 1st and 5th of the month" });
    }

    const contractResult = await pool.query(
      "SELECT contract_id, owner_id, tenant_id FROM contracts WHERE contract_id = $1",
      [contract_id],
    );
    if (contractResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }
    const contract = contractResult.rows[0];
    if (contract.tenant_id !== tenantId) {
      return res.status(403).json({ success: false, message: "This contract does not belong to you" });
    }

    const result = await pool.query(
      `INSERT INTO cash_schedules (contract_id, tenant_id, collection_date, time_preference, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING schedule_id, contract_id, collection_date, time_preference`,
      [contract_id, tenantId, collection_date, time_preference, notes || null],
    );
    const schedule = result.rows[0];

    await notify({
      userId: contract.owner_id,
      type: "cash_pickup_scheduled",
      title: "Cash pickup requested",
      message: `Tenant scheduled a cash rent pickup for ${collection_date} (${time_preference}).`,
      linkUrl: `/rent/cash-schedule/${schedule.schedule_id}`,
    });

    return res.status(200).json({
      schedule_id: `CSH-SCH-${schedule.schedule_id}`,
      contract_id: schedule.contract_id,
      collection_date: schedule.collection_date,
      time_preference: schedule.time_preference,
      status: "scheduled",
      message: "Cash pickup request logged. Landlord notified.",
    });
  } catch (err) {
    console.error("scheduleCashPickup error: ", err);
    if (err.code === "23514") {
      return res.status(422).json({ success: false, message: "Cash pickup date must fall between the 1st and 5th of the month" });
    }
    return res.status(500).json({ success: false, message: "Failed to schedule cash pickup" });
  }
};

module.exports = { getCurrentRent, scheduleCashPickup };