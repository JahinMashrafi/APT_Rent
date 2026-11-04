const pool = require("../config/db.js");
const { SIGNABLE_STATUSES, toDateOnly, contractPermissions } = require("../utils/contractState.js");
const { saveBase64Signature } = require("../utils/signature.js");
const { generateReceipt } = require("../utils/receipt.js");
const { signFields, CONTRACT_SIGNED_FIELDS, PAYMENT_SIGNED_FIELDS } = require("../utils/signFields.js");
const { notify } = require("../utils/notify.js");
// --- NEW: lease PDF generation + the same bucket-upload helper
// --- propertyController.js already uses for photos.
const { buildContractPdfBuffer } = require("../utils/contractPdf.js");
const { uploadToBucket } = require("../utils/storage.js");
const { buildDefaultTerms, monthsBetween, formatDuration } = require("../utils/leaseDefaults.js");

const negotiateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const { rate, deposit, message } = req.body || {};
    const nextRate = Number(rate);
    const nextDeposit = Number(deposit);

    if (!Number.isFinite(nextRate) || nextRate <= 0 || !Number.isFinite(nextDeposit) || nextDeposit < 0) {
      return res.status(422).json({ success: false, message: "A valid rent and non-negative deposit are required" });
    }

    const found = await pool.query("SELECT * FROM contracts WHERE contract_id = $1", [id]);
    if (found.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }
    const c = found.rows[0];
    const perms = contractPermissions(c, userId);

    if (perms.viewer_role === "none") {
      return res.status(403).json({ success: false, message: "You are not part of this contract" });
    }
    if (perms.awaiting_other_party) {
      return res.status(409).json({ success: false, message: "Your proposal is waiting for the other party's response." });
    }
    if (!perms.can_counter) {
      return res.status(409).json({ success: false, message: "Terms are already accepted. Sign the lease instead of renegotiating." });
    }

    const isOwner = perms.viewer_role === "owner";
    const nextStatus = isOwner ? "owner_proposed" : "tenant_proposed";

    // Default terms quote the deposit; if the wording is still the untouched default, keep it in step with the new number.
    const ymd = (v) => toDateOnly(v);
    const oldDefault = buildDefaultTerms({ startDate: ymd(c.start_date), endDate: ymd(c.end_date), deposit: Number(c.deposit) });
    const newDefault = buildDefaultTerms({ startDate: ymd(c.start_date), endDate: ymd(c.end_date), deposit: nextDeposit });

    // Compare-and-swap: only update if nobody changed the negotiation since we read it.
    const result = await pool.query(
      `UPDATE contracts
       SET rate = $1, deposit = $2, negotiation_message = $3, negotiation_status = $4, updated_at = NOW(),
           terms_and_conditions = CASE WHEN terms_and_conditions = $7 THEN $8 ELSE terms_and_conditions END
       WHERE contract_id = $5 AND status = 'draft' AND negotiation_status = $6
       RETURNING *`,
      [nextRate, nextDeposit, message?.trim() || null, nextStatus, id, c.negotiation_status, oldDefault, newDefault],
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, message: "This lease changed while you were editing. Refresh and try again." });
    }
    const updated = result.rows[0];

    await notify({
      userId: isOwner ? c.tenant_id : c.owner_id,
      type: "contract_negotiation",
      title: isOwner ? "Landlord counter-offered lease terms" : "Tenant proposed lease terms",
      message: message?.trim() || `${isOwner ? "Landlord counter-offered" : "Tenant proposed"} rent ৳${nextRate} and deposit ৳${nextDeposit}.`,
      linkUrl: "/contracts",
    });

    return res.status(200).json({
      contract_id: updated.contract_id,
      rate: updated.rate,
      deposit: updated.deposit,
      negotiation_message: updated.negotiation_message,
      negotiation_status: updated.negotiation_status,
      status: updated.status,
      ...contractPermissions(updated, userId),
    });
  } catch (err) {
    console.error("negotiateContract error: ", err);
    return res.status(500).json({ success: false, message: "Failed to submit lease proposal" });
  }
};

const acceptContract = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const found = await pool.query("SELECT * FROM contracts WHERE contract_id = $1", [id]);
    if (found.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }
    const c = found.rows[0];
    const perms = contractPermissions(c, userId);

    if (perms.viewer_role === "none") {
      return res.status(403).json({ success: false, message: "You are not part of this contract" });
    }
    if (perms.awaiting_other_party) {
      return res.status(403).json({ success: false, message: "You cannot accept your own proposal. Wait for the other party to respond." });
    }
    if (!perms.can_accept) {
      return res.status(409).json({ success: false, message: "There is no pending proposal to accept" });
    }

    const result = await pool.query(
      `UPDATE contracts SET negotiation_status = 'accepted', updated_at = NOW()
       WHERE contract_id = $1 AND status = 'draft' AND negotiation_status = $2
       RETURNING *`,
      [id, c.negotiation_status],
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, message: "This proposal was already answered. Refresh and try again." });
    }
    const updated = result.rows[0];
    const isOwner = perms.viewer_role === "owner";

    await notify({
      userId: isOwner ? c.tenant_id : c.owner_id,
      type: "contract_accepted",
      title: isOwner ? "Landlord accepted lease terms" : "Tenant accepted lease terms",
      message: `${isOwner ? "The landlord" : "The tenant"} accepted contract #${id}. Both parties can now sign.`,
      linkUrl: "/contracts",
    });

    return res.status(200).json({
      contract_id: updated.contract_id,
      rate: updated.rate,
      deposit: updated.deposit,
      status: updated.status,
      negotiation_status: updated.negotiation_status,
      ...contractPermissions(updated, userId),
    });
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
      return res
        .status(422)
        .json({ success: false, message: "property_id, tenant_id, rate, start_date, and end_date are required" });
    }


    const infoResult = await pool.query(
      `SELECT p.owner_id, p.address, p.deposit,
              owner.name AS owner_name,
              tenant.name AS tenant_name, tenant.email AS tenant_email
       FROM properties p
       JOIN users owner ON owner.user_id = p.owner_id
       JOIN users tenant ON tenant.user_id = $2
       WHERE p.property_id = $1 AND p.availability_status != 'archived'`,
      [property_id, tenant_id],
    );
    if (infoResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Property or tenant not found" });
    }
    const info = infoResult.rows[0];
    if (info.owner_id !== ownerId && !req.user.is_admin) {
      return res.status(403).json({ success: false, message: "You do not own this property" });
    }

    const finalDeposit = deposit ?? info.deposit ?? 0;
    // Default wording only when the landlord did not supply their own; it is stored, so it stays editable.
    const finalTerms = typeof terms_and_conditions === "string" && terms_and_conditions.trim()
      ? terms_and_conditions
      : buildDefaultTerms({ startDate: start_date, endDate: end_date, deposit: finalDeposit });

    // One open contract per (property, tenant). The advisory lock makes two simultaneous
    // "approve" clicks queue up, so the second one sees the first one's row and is refused.
    const client = await pool.connect();
    let contract;
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [Number(property_id)]);
      const dup = await client.query(
        `SELECT contract_id, status::text AS status FROM contracts
          WHERE property_id = $1 AND tenant_id = $2 AND status::text NOT IN ('terminated', 'completed')
          ORDER BY contract_id DESC LIMIT 1`,
        [property_id, tenant_id],
      );
      if (dup.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: `A contract (#${dup.rows[0].contract_id}, ${dup.rows[0].status}) already exists for this tenant and property. Terminate it first if you need a new one.`,
        });
      }
      const result = await client.query(
        `INSERT INTO contracts (owner_id, property_id, tenant_id, rate, deposit, start_date, end_date,
                                terms_and_conditions, negotiation_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'owner_proposed')
         RETURNING contract_id, owner_id, tenant_id, property_id, rate, deposit, start_date, end_date,
                   status, negotiation_status, created_at`,
        [ownerId, property_id, tenant_id, rate, finalDeposit, start_date, end_date, finalTerms],
      );
      await client.query("COMMIT");
      contract = result.rows[0];
    } catch (txErr) {
      await client.query("ROLLBACK").catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }


    let contractPdfUrl = null;
    try {
      const pdfBuffer = await buildContractPdfBuffer({
        landlordName: info.owner_name,
        tenantName: info.tenant_name,
        tenantEmail: info.tenant_email,
        propertyAddress: info.address,
        rate,
        depositAmount: finalDeposit,
        startDate: start_date,
        endDate: end_date,
        contractId: contract.contract_id,
        termsAndConditions: finalTerms,
        durationLabel: formatDuration(monthsBetween(start_date, end_date)),
      });

      const path = `contracts/${contract.contract_id}.pdf`;
      const { url } = await uploadToBucket("contract-pdfs", path, pdfBuffer, "application/pdf");
      contractPdfUrl = url;

      await pool.query("UPDATE contracts SET contract_pdf_url = $1 WHERE contract_id = $2", [
        url,
        contract.contract_id,
      ]);
    } catch (pdfErr) {
      console.error("Lease PDF generation failed (contract still created): ", pdfErr);
    }

    await notify({
      userId: tenant_id,
      type: "contract_issued",
      title: "New lease agreement",
      message: `A draft lease was issued for property #${property_id}. Please review and sign.`,
      linkUrl: "/contracts",
    });

    return res.status(201).json({ ...contract, terms_and_conditions: finalTerms, contract_pdf_url: contractPdfUrl });
  } catch (err) {
    console.error("createContract error: ", err);
    return res.status(500).json({ success: false, message: "Failed to create contract" });
  }
};

// GET /contracts  [auth required]
const listContracts = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await pool.query(
      `SELECT c.contract_id, c.property_id, p.address AS property_address,
              c.owner_id, c.tenant_id, c.rate, c.deposit, c.start_date, c.end_date,
              c.owner_signature_url, c.tenant_signature_url, c.status, c.created_at,
              c.negotiation_status, c.contract_pdf_url,
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
      start_date: toDateOnly(row.start_date),
      end_date: toDateOnly(row.end_date),
      owner_signature_url: row.owner_signature_url,
      tenant_signature_url: row.tenant_signature_url,
      status: row.status,
      negotiation_status: row.negotiation_status,
      created_at: row.created_at,
      contract_pdf_url: row.contract_pdf_url,
      ...contractPermissions(row, userId),
    }));

    return res.status(200).json({ data });
  } catch (err) {
    console.error("listContracts error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch contracts" });
  }
};

// GET /contracts/:id  [auth required]
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
      start_date: toDateOnly(signed.start_date),
      end_date: toDateOnly(signed.end_date),
      terms_and_conditions: signed.terms_and_conditions,
      owner_signature_url: signed.owner_signature_url,
      tenant_signature_url: signed.tenant_signature_url,
      status: signed.status,
      negotiation_message: signed.negotiation_message,
      negotiation_status: signed.negotiation_status,
      ...contractPermissions(contract, req.user.user_id),
    });
  } catch (err) {
    console.error("getContractById error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch contract" });
  }
};

// PATCH /contracts/:id/sign  [auth required]
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
    const perms = contractPermissions(contract, userId);

    if (perms.viewer_role === "none") {
      return res.status(403).json({ success: false, message: "You are not part of this contract" });
    }
    if (perms.negotiation_state !== "TERMS_ACCEPTED") {
      return res.status(409).json({ success: false, message: "Lease terms must be accepted by the other party before signing" });
    }
    if (!perms.can_sign) {
      return res.status(409).json({ success: false, message: "You have already signed, or this lease can no longer be signed" });
    }

    const role = perms.viewer_role;
    const column = role === "owner" ? "owner_signature_url" : "tenant_signature_url";
    const otherColumn = role === "owner" ? "tenant_signature_url" : "owner_signature_url";

    let signaturePath;
    try {
      signaturePath = await saveBase64Signature(signature_image_base64, `sig-${role}-${userId}`);
    } catch (e) {
      return res.status(422).json({ success: false, message: e.message });
    }

    

    const updateResult = await pool.query(
      `UPDATE contracts
       SET ${column} = $1,
           status = CASE WHEN ${otherColumn} IS NOT NULL
                         THEN 'fully_signed'::contract_status_enum
                         ELSE $2::contract_status_enum END,
           updated_at = NOW()
       WHERE contract_id = $3 AND negotiation_status = 'accepted'
         AND status = ANY($4::contract_status_enum[]) AND ${column} IS NULL
       RETURNING *`,
      [signaturePath, `signed_by_${role}`, id, SIGNABLE_STATUSES],
    );
    if (updateResult.rows.length === 0) {
      return res.status(409).json({ success: false, message: "The lease changed while signing. Refresh and try again." });
    }

    const row = updateResult.rows[0];
    const signed = await signFields(row, CONTRACT_SIGNED_FIELDS);

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
      ...contractPermissions(row, userId),
      message:
        signed.status === "fully_signed"
          ? "Both parties have signed. Waiting for the landlord to activate the lease."
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
    if (!["fully_signed", "active"].includes(contract.status)) {
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
    // Occupancy and lease status are changed ONLY by the landlord's activation (see contractActionsController).

    await pool.query(
      `INSERT INTO history (owner_id, tenant_id, property_id, contract_id, payment_status, due_amount, deposit_amount, deposit_paid_at, deadline)
       VALUES ($1, $2, $3, $4, TRUE, 0, $5, NOW(), $6)`,
      [contract.owner_id, tenantId, contract.property_id, id, amount, contract.start_date],
    );

    await notify({
      userId: contract.owner_id,
      type: "deposit_paid",
      title: "Security deposit received",
      message: `Deposit recorded for contract #${id}.`,
      linkUrl: `/contracts/${id}`,
    });

    const signedPayment = await signFields({ receipt_url: receiptPath }, PAYMENT_SIGNED_FIELDS);

    return res.status(200).json({
      payment_id: payment.payment_id,
      contract_id: Number(id),
      deposit_paid: amount,
      payment_status: payment.status,
      contract_status: contract.status,
      receipt_url: signedPayment.receipt_url,
    });
  } catch (err) {
    console.error("payDeposit error: ", err);
    return res.status(500).json({ success: false, message: "Failed to process deposit payment" });
  }
};

module.exports = { createContract, listContracts, getContractById, signContract, payDeposit, negotiateContract, acceptContract };