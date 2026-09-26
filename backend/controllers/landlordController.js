const pool = require("../config/db.js");
const { isoDate } = require("../utils/dateFormat.js");

// GET /landlord/rent-ledger  [landlord only]
const getLandlordLedger = async (req, res) => {
  try {
    const ownerId = req.user.user_id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const deadline = isoDate(new Date(now.getFullYear(), now.getMonth(), 5));

    const contractsResult = await pool.query(
      `SELECT c.contract_id, c.rate, c.tenant_id, c.property_id,
              u.name AS tenant_name, p.address AS property_address
       FROM contracts c
       JOIN users u ON u.user_id = c.tenant_id
       JOIN properties p ON p.property_id = c.property_id
       WHERE c.owner_id = $1 AND c.status = 'active'`,
      [ownerId],
    );

    let totalReceivable = 0;
    let totalCollected = 0;
    const records = [];

    for (const contract of contractsResult.rows) {
      totalReceivable += Number(contract.rate);

      const paymentCheck = await pool.query(
        `SELECT amount FROM payments
         WHERE contract_id = $1 AND status = 'paid'
           AND payment_date >= $2 AND payment_date < $3
         LIMIT 1`,
        [contract.contract_id, monthStart, monthEnd],
      );
      const isPaid = paymentCheck.rows.length > 0;
      if (isPaid) totalCollected += Number(paymentCheck.rows[0].amount);

      records.push({
        contract_id: contract.contract_id,
        tenant_name: contract.tenant_name,
        property_address: contract.property_address,
        amount: contract.rate,
        status: isPaid ? "paid" : "due",
        deadline,
      });
    }

    return res.status(200).json({
      summary: {
        total_monthly_receivable: totalReceivable,
        total_collected: totalCollected,
        total_pending: totalReceivable - totalCollected,
      },
      records,
    });
  } catch (err) {
    console.error("getLandlordLedger error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch rent ledger" });
  }
};

module.exports = { getLandlordLedger };