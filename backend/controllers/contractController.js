const pool = require("../config/db.js");
const { saveBase64Signature } = require("../utils/signature.js");
const { generateReceipt } = require("../utils/receipt.js");
const { signFields, CONTRACT_SIGNED_FIELDS, PAYMENT_SIGNED_FIELDS } = require("../utils/signFields.js");
const { notify } = require("../utils/notify.js");

const negotiateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.user_id;
    const { rate, deposit, message } = req.body || {};
    const nextRate = Number(rate);
    const nextDeposit = Number(deposit);

    if (!Number.isFinite(nextRate) || nextRate <= 0 || !Number.isFinite(nextDeposit) || nextDeposit < 0) {
      return res.status(422).json({ success: false, message: "A valid rent and non-negative deposit are required" });
    }

    const result = await pool.query(
      `UPDATE contracts
       SET rate = $1, deposit = $2, negotiation_message = $3, negotiation_status = 'proposed', updated_at = NOW()
       WHERE contract_id = $4 AND tenant_id = $5 AND status = 'draft'
       RETURNING contract_id, rate, deposit, negotiation_message, negotiation_status, status`,
      [nextRate, nextDeposit, message?.trim() || null, id, tenantId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Draft contract not found for this tenant" });
    }

    const contract = await pool.query("SELECT owner_id FROM contracts WHERE contract_id = $1", [id]);
    await notify({
      userId: contract.rows[0].owner_id,
      type: "contract_negotiation",
      title: "Tenant proposed lease terms",
      message: message?.trim() || `Tenant proposed rent ৳${nextRate} and deposit ৳${nextDeposit}.`,
      linkUrl: "/contracts",
    });
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("negotiateContract error: ", err);
    return res.status(500).json({ success: false, message: "Failed to submit lease proposal" });
  }
};

const acceptContract = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.user_id;
    const result = await pool.query(
      `UPDATE contracts
       SET negotiation_status = 'accepted', updated_at = NOW()
       WHERE contract_id = $1 AND tenant_id = $2 AND status = 'draft'
       RETURNING contract_id, rate, deposit, status, negotiation_status`,
      [id, tenantId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Draft contract not found for this tenant" });
    }
    const owner = await pool.query("SELECT owner_id FROM contracts WHERE contract_id = $1", [id]);
    await notify({
      userId: owner.rows[0].owner_id,
      type: "contract_accepted",
      title: "Lease accepted",
      message: `The tenant accepted contract #${id}.`,
      linkUrl: "/contracts",
    });
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("acceptContract error: ", err);
    return res.status(500).json({ success: false, message: "Failed to accept lease" });
  }
};

// POST /contracts  [landlord only]
const createContract = async (req, res) => {
  try {
    const ownerId = req.user.user_id;
    const { property_id, tenant_id, rate, deposit, start_date, end_date, terms_and_conditions } = req.body || {};

    if (!property_id || !tenant_id || !rate || !start_date || !end_date) {
      return res.status(422).json({ success: false, message: "property_id, tenant_id, rate, start_date, and end_date are required" });
    }

    const propCheck = await pool.query(
      "SELECT owner_id FROM properties WHERE property_id = $1 AND availability_status != 'archived'",
      [property_id],
    );
    if (propCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    if (propCheck.rows[0].owner_id !== ownerId && !req.user.is_admin) {
      return res.status(403).json({ success: false, message: "You do not own this property" });
    }

    const result = await pool.query(
      `INSERT INTO contracts (owner_id, property_id, tenant_id, rate, deposit, start_date, end_date, terms_and_conditions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING contract_id, owner_id, tenant_id, property_id, rate, deposit, start_date, end_date, status, created_at`,
      [ownerId, property_id, tenant_id, rate, deposit ?? 0, start_date, end_date, terms_and_conditions || null],
    );

    await notify({
      userId: tenant_id,
      type: "contract_issued",
      title: "New lease agreement",
      message: `A draft lease was issued for property #${property_id}. Please review and sign.`,
      linkUrl: "/contracts",
    });

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createContract error: ", err);
    return res.status(500).json({ success: false, message: "Failed to create contract" });
  }
};

// GET /contracts  [auth required] — every lease the caller is a party to.
// The by-id endpoint already gates on party membership; this lists them up
// front so tenant and landlord can pull their contracts up at any time
// without having to remember a contract id.
const listContracts = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await pool.query(
      `SELECT c.contract_id, c.property_id, p.address AS property_address,
              c.owner_id, c.tenant_id, c.rate, c.deposit, c.start_date, c.end_date,
              c.owner_signature_url, c.tenant_signature_url, c.status, c.created_at,
              c.negotiation_status,
              owner.name AS owner_name, tenant.name AS tenant_name
       FROM contracts c
       JOIN properties p ON p.property_id = c.property_id
       JOIN users owner ON owner.user_id = c.owner_id
       JOIN users tenant ON tenant.user_id = c.tenant_id
       WHERE c.owner_id = $1 OR c.tenant_id = $1
       ORDER BY c.created_at DESC`,
      [userId],
    );

    const data = result.rows.map((row) => ({
      contract_id: row.contract_id,
      property_id: row.property_id,
      property_address: row.property_address,
      owner: { user_id: row.owner_id, name: row.owner_name },
      tenant: { user_id: row.tenant_id, name: row.tenant_name },
      rate: row.rate,
      deposit: row.deposit,
      start_date: row.start_date,
      end_date: row.end_date,
      owner_signature_url: row.owner_signature_url,
      tenant_signature_url: row.tenant_signature_url,
      status: row.status,
      negotiation_status: row.negotiation_status,
      created_at: row.created_at,
    }));

    return res.status(200).json({ data });
  } catch (err) {
    console.error("listContracts error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch contracts" });
  }
};

// GET /contracts/:id  [auth required — owner or tenant on the contract]
const getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT c.*, p.address AS property_address
       FROM contracts c JOIN properties p ON p.property_id = c.property_id
       WHERE c.contract_id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }
    const contract = result.rows[0];
    const isParty = contract.owner_id === req.user.user_id || contract.tenant_id === req.user.user_id;
    if (!isParty && !req.user.is_admin) {
      return res.status(403).json({ success: false, message: "You are not part of this contract" });
    }

    const signed = await signFields(contract, CONTRACT_SIGNED_FIELDS);

    return res.status(200).json({
      contract_id: signed.contract_id,
      property_id: signed.property_id,
      property_address: signed.property_address,
      owner_id: signed.owner_id,
      tenant_id: signed.tenant_id,
      rate: signed.rate,
      deposit: signed.deposit,
      start_date: signed.start_date,
      end_date: signed.end_date,
      terms_and_conditions: signed.terms_and_conditions,
      owner_signature_url: signed.owner_signature_url,
      tenant_signature_url: signed.tenant_signature_url,
      status: signed.status,
      negotiation_message: signed.negotiation_message,
      negotiation_status: signed.negotiation_status,
    });
  } catch (err) {
    console.error("getContractById error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch contract" });
  }
};

// PATCH /contracts/:id/sign  [auth required — auto-detects owner vs tenant]
const signContract = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const { signature_image_base64 } = req.body || {};

    if (!signature_image_base64) {
      return res.status(422).json({ success: false, message: "signature_image_base64 is required" });
    }

    const result = await pool.query("SELECT * FROM contracts WHERE contract_id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }
    const contract = result.rows[0];

    let role;
    if (contract.owner_id === userId) role = "owner";
    else if (contract.tenant_id === userId) role = "tenant";
    else return res.status(403).json({ success: false, message: "You are not part of this contract" });

    let signaturePath;
    try {
      signaturePath = await saveBase64Signature(signature_image_base64, `sig-${role}-${userId}`);
    } catch (e) {
      return res.status(422).json({ success: false, message: e.message });
    }

    const column = role === "owner" ? "owner_signature_url" : "tenant_signature_url";
    const otherPartyAlreadySigned = role === "owner"
      ? Boolean(contract.tenant_signature_url)
      : Boolean(contract.owner_signature_url);
    const newStatus = otherPartyAlreadySigned ? "fully_signed" : `signed_by_${role}`;

    const updateResult = await pool.query(
      `UPDATE contracts SET ${column} = $1, status = $2, updated_at = NOW()
       WHERE contract_id = $3
       RETURNING contract_id, owner_signature_url, tenant_signature_url, status`,
      [signaturePath, newStatus, id],
    );

    const signed = await signFields(updateResult.rows[0], CONTRACT_SIGNED_FIELDS);

    const otherPartyId = role === "owner" ? contract.tenant_id : contract.owner_id;
    await notify({
      userId: otherPartyId,
      type: "contract_signed",
      title: "Contract signed",
      message: `The ${role} signed contract #${id}.`,
      linkUrl: `/contracts/${id}`,
    });

    return res.status(200).json({
      contract_id: signed.contract_id,
      owner_signature_url: signed.owner_signature_url,
      tenant_signature_url: signed.tenant_signature_url,
      status: signed.status,
      message: signed.status === "fully_signed"
        ? "Both parties have signed. Proceed to security deposit payment."
        : "Signature registered. Waiting on the other party to sign.",
    });
  } catch (err) {
    console.error("signContract error: ", err);
    return res.status(500).json({ success: false, message: "Failed to register signature" });
  }
};

// POST /contracts/:id/deposit  [tenant only]
const payDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.user_id;
    const { amount, payment_method, transaction_reference } = req.body || {};

    if (!amount || !payment_method) {
      return res.status(422).json({ success: false, message: "amount and payment_method are required" });
    }

    const result = await pool.query(
      `SELECT c.*, p.deposit AS property_deposit, p.address
       FROM contracts c JOIN properties p ON p.property_id = c.property_id
       WHERE c.contract_id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }
    const contract = result.rows[0];
    if (contract.tenant_id !== tenantId) {
      return res.status(403).json({ success: false, message: "This contract does not belong to you" });
    }
    if (contract.status !== "fully_signed") {
      return res.status(422).json({
        success: false,
        message: `Contract must be fully signed by both parties before the deposit can be paid (current status: ${contract.status})`,
      });
    }

    const paymentResult = await pool.query(
      `INSERT INTO payments (owner_id, tenant_id, property_id, contract_id, amount, payment_method, status, transaction_reference)
       VALUES ($1, $2, $3, $4, $5, $6, 'paid', $7)
       RETURNING payment_id, payment_date, status`,
      [contract.owner_id, tenantId, contract.property_id, id, amount, payment_method, transaction_reference || null],
    );
    const payment = paymentResult.rows[0];

    const receiptPath = await generateReceipt({
      title: "Security Deposit Receipt",
      lines: [
        `Contract #${id}`,
        `Property: ${contract.address}`,
        `Amount: BDT ${amount}`,
        `Payment method: ${payment_method}`,
        transaction_reference ? `Reference: ${transaction_reference}` : null,
        `Date: ${payment.payment_date.toISOString()}`,
      ].filter(Boolean),
    });

    await pool.query("UPDATE payments SET receipt_url = $1 WHERE payment_id = $2", [receiptPath, payment.payment_id]);
    await pool.query("UPDATE contracts SET status = 'active', updated_at = NOW() WHERE contract_id = $1", [id]);

    await pool.query(
      `INSERT INTO history (owner_id, tenant_id, property_id, contract_id, payment_status, due_amount, deposit_amount, deposit_paid_at, deadline)
       VALUES ($1, $2, $3, $4, TRUE, 0, $5, NOW(), $6)`,
      [contract.owner_id, tenantId, contract.property_id, id, amount, contract.start_date],
    );

    await notify({
      userId: contract.owner_id,
      type: "deposit_paid",
      title: "Security deposit received",
      message: `Deposit paid for contract #${id}. Lease is now active.`,
      linkUrl: `/contracts/${id}`,
    });

    const signedPayment = await signFields({ receipt_url: receiptPath }, PAYMENT_SIGNED_FIELDS);

    return res.status(200).json({
      payment_id: payment.payment_id,
      contract_id: Number(id),
      deposit_paid: amount,
      payment_status: payment.status,
      contract_status: "active",
      receipt_url: signedPayment.receipt_url,
    });
  } catch (err) {
    console.error("payDeposit error: ", err);
    return res.status(500).json({ success: false, message: "Failed to process deposit payment" });
  }
};

module.exports = { createContract, listContracts, getContractById, signContract, payDeposit, negotiateContract, acceptContract };