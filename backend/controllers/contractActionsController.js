const pool = require("../config/db.js");
const { notify } = require("../utils/notify.js");

const parseId = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) { res.status(400).json({ success: false, message: "Contract id must be a positive integer." }); return null; }
  return id;
};

// PATCH /contracts/:id/activate  [landlord]
// THE single source of truth for occupancy. In one transaction it makes the lease Active and the unit
// Occupied. Signing never does this; payment happens outside the app.
const activateContract = async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const client = await pool.connect();
  let c;
  try {
    await client.query("BEGIN");
    // Row lock: two clicks (or two tabs) queue up, and the second sees the first one's result.
    const { rows } = await client.query(
      `SELECT c.contract_id, c.owner_id, c.tenant_id, c.property_id, c.status::text AS status,
              p.owner_id AS property_owner_id, p.address, p.availability_status::text AS property_status
         FROM contracts c JOIN properties p ON p.property_id = c.property_id
        WHERE c.contract_id = $1 FOR UPDATE OF c`,
      [id],
    );
    if (rows.length === 0) { await client.query("ROLLBACK"); return res.status(404).json({ success: false, message: "Contract not found." }); }
    c = rows[0];
    if (c.owner_id !== req.user.user_id) { await client.query("ROLLBACK"); return res.status(403).json({ success: false, message: "Only the landlord of this contract can activate it." }); }
    if (c.property_owner_id !== c.owner_id) { await client.query("ROLLBACK"); return res.status(409).json({ success: false, message: "The landlord on this contract does not own the unit." }); }
    if (c.property_status === "archived") { await client.query("ROLLBACK"); return res.status(409).json({ success: false, message: "This unit is archived." }); }
    if (c.status === "active") { await client.query("ROLLBACK"); return res.status(409).json({ success: false, message: "This lease is already active." }); }
    if (c.status !== "fully_signed") {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: `Only a fully signed lease can be activated (current status: ${c.status}).` });
    }
    const tenant = await client.query("SELECT 1 FROM users WHERE user_id = $1", [c.tenant_id]);
    if (tenant.rows.length === 0) { await client.query("ROLLBACK"); return res.status(409).json({ success: false, message: "The tenant on this lease no longer exists." }); }
    const other = await client.query("SELECT contract_id FROM contracts WHERE property_id = $1 AND status::text = 'active' AND contract_id <> $2 LIMIT 1", [c.property_id, id]);
    if (other.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: `This unit already has an active lease (#${other.rows[0].contract_id}). Terminate it first.` });
    }

    await client.query("UPDATE contracts SET status = 'active', updated_at = NOW() WHERE contract_id = $1", [id]);
    await client.query("UPDATE properties SET availability_status = 'rented', tenant_id = $2 WHERE property_id = $1", [c.property_id, c.tenant_id]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("activateContract error: ", err);
    return res.status(500).json({ success: false, message: "Failed to activate the lease." });
  } finally {
    client.release();
  }

  await notify({ userId: c.tenant_id, type: "lease_active", title: "Your lease is now active", message: `The lease for ${c.address} is active.`, linkUrl: "/tenant" }).catch(() => {});
  return res.status(200).json({ contract_id: id, status: "active", property_id: c.property_id, unit_status: "occupied" });
};

// PATCH /contracts/:id/terminate  [landlord] — ends any open contract (e.g. a duplicate created by mistake)
const terminateContract = async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const { rows } = await pool.query(
    `SELECT c.contract_id, c.owner_id, c.tenant_id, c.property_id, c.status::text AS status, p.address
       FROM contracts c JOIN properties p ON p.property_id = c.property_id WHERE c.contract_id = $1`,
    [id],
  );
  if (rows.length === 0) return res.status(404).json({ success: false, message: "Contract not found." });
  const c = rows[0];
  if (c.owner_id !== req.user.user_id) return res.status(403).json({ success: false, message: "Only the landlord of this contract can do that." });
  if (["terminated", "completed"].includes(c.status)) return res.status(422).json({ success: false, message: `This contract is already ${c.status}.` });

  await pool.query("UPDATE contracts SET status = 'terminated', updated_at = NOW() WHERE contract_id = $1", [id]);
  // Free the flat only if it was occupied through THIS lease and nothing else is live on it.
  const live = await pool.query("SELECT 1 FROM contracts WHERE property_id = $1 AND contract_id <> $2 AND status::text = 'active' LIMIT 1", [c.property_id, id]);
  if (c.status === "active" && live.rows.length === 0) {
    await pool.query("UPDATE properties SET availability_status = 'available', tenant_id = NULL WHERE property_id = $1 AND availability_status::text <> 'archived'", [c.property_id]);
  }
  await notify({ userId: c.tenant_id, type: "lease_terminated", title: "Contract terminated", message: `The landlord terminated the contract for ${c.address}.`, linkUrl: "/contracts" }).catch(() => {});
  return res.status(200).json({ contract_id: id, status: "terminated" });
};

module.exports = { activateContract, terminateContract };