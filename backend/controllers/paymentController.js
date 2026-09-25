const pool = require("../config/db.js");
const { generateReceipt } = require("../utils/receipt.js");
const { signFields, PAYMENT_SIGNED_FIELDS } = require("../utils/signFields.js");
const { notify } = require("../utils/notify.js");

const monthStartOf = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

// POST /payments  [tenant only]
const createPayment = async (req, res) => {
  try {
    const tenantId = req.user.user_id;
    const { contract_id, property_id, amount, payment_method, transaction_ref } = req.body || {};

    if (!contract_id || !property_id || !amount || !payment_method) {
      return res.status(422).json({ success: false, message: "contract_id, property_id, amount, and payment_method are required" });
    }

    const contractResult = await pool.query(
      `SELECT c.*, p.address FROM contracts c
       JOIN properties p ON p.property_id = c.property_id
       WHERE c.contract_id = $1`,
      [contract_id],
    );
    if (contractResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }
    const contract = contractResult.rows[0];
    if (contract.tenant_id !== tenantId) {
      return res.status(403).json({ success: false, message: "This contract does not belong to you" });
    }
    if (contract.status !== "active") {
      return res.status(422).json({ success: false, message: `Contract is not active (current status: ${contract.status})` });
    }

    const paymentResult = await pool.query(
      `INSERT INTO payments (owner_id, tenant_id, property_id, contract_id, amount, payment_method, status, transaction_reference)
       VALUES ($1, $2, $3, $4, $5, $6, 'paid', $7)
       RETURNING payment_id, payment_date, status`,
      [contract.owner_id, tenantId, property_id, contract_id, amount, payment_method, transaction_ref || null],
    );
    const payment = paymentResult.rows[0];

    const receiptPath = await generateReceipt({
      title: "Rent Payment Receipt",
      lines: [
        `Contract #${contract_id}`,
        `Property: ${contract.address}`,
        `Amount: BDT ${amount}`,
        `Payment method: ${payment_method}`,
        transaction_ref ? `Reference: ${transaction_ref}` : null,
        `Date: ${payment.payment_date.toISOString()}`,
      ].filter(Boolean),
    });

    await pool.query("UPDATE payments SET receipt_url = $1 WHERE payment_id = $2", [receiptPath, payment.payment_id]);

    const billingMonth = monthStartOf(payment.payment_date);
    const existingHistory = await pool.query(
      "SELECT history_id FROM history WHERE contract_id = $1 AND billing_month = $2",
      [contract_id, billingMonth],
    );
    if (existingHistory.rows.length > 0) {
      await pool.query(
        "UPDATE history SET payment_status = TRUE, due_amount = 0, updated_at = NOW() WHERE history_id = $1",
        [existingHistory.rows[0].history_id],
      );
    } else {
      const deadline = new Date(billingMonth.getFullYear(), billingMonth.getMonth(), 5);
      await pool.query(
        `INSERT INTO history (owner_id, tenant_id, property_id, contract_id, payment_status, due_amount, billing_month, deadline)
         VALUES ($1, $2, $3, $4, TRUE, 0, $5, $6)`,
        [contract.owner_id, tenantId, property_id, contract_id, billingMonth, deadline],
      );
    }

    await notify({
      userId: contract.owner_id,
      type: "rent_paid",
      title: "Rent payment received",
      message: `Tenant paid BDT ${amount} for contract #${contract_id}.`,
      linkUrl: `/landlord/rent-ledger`,
    });

    const signedPayment = await signFields(
      { receipt_url: receiptPath },
      PAYMENT_SIGNED_FIELDS,
    );

    return res.status(201).json({
      payment_id: payment.payment_id,
      contract_id,
      amount,
      payment_method,
      status: payment.status,
      payment_date: payment.payment_date,
      receipt_url: signedPayment.receipt_url,
    });
  } catch (err) {
    console.error("createPayment error: ", err);
    return res.status(500).json({ success: false, message: "Failed to process payment" });
  }
};

module.exports = { createPayment };