const pool = require("../config/db.js");
const { notify } = require("../utils/notify.js");

const load = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) { res.status(400).json({ success: false, message: "Contract id must be a positive integer." }); return null; }
  const { rows } = await pool.query(
    `SELECT c.contract_id, c.owner_id, c.tenant_id, c.property_id, c.status::text AS status, p.address
       FROM contracts c JOIN properties p ON p.property_id = c.property_id WHERE c.contract_id = $1`,
    [id],
  );
  if (rows.length === 0) { res.status(404).json({ success: false, message: "Contract not found." }); return null; }
  if (rows[0].owner_id !== req.user.user_id) { res.status(403).json({ success: false, message: "Only the landlord of this contract can do that." }); return null; }
  return rows[0];
};

// PATCH /contracts/:id/activate  [landlord] — after both parties signed, the landlord confirms the lease is live.
// Payment happens outside the app (at signing), so there is no deposit step here.
const activateContract = async (req, res) => {
  const c = await load(req, res);
  if (!c) return;
  if (c.status !== "fully_signed") {
    return res.status(422).json({ success: false, message: `Only a fully signed contract can be activated (current status: ${c.status}).` });
  }
  await pool.query("UPDATE contracts SET status = 'active', updated_at = NOW() WHERE contract_id = $1", [c.contract_id]);
  await pool.query(
    "UPDATE properties SET availability_status = 'rented', tenant_id = $2 WHERE property_id = $1 AND availability_status::text <> 'archived'",
    [c.property_id, c.tenant_id],
  );
  await notify({ userId: c.tenant_id, type: "lease_active", title: "Your lease is now active", message: `The lease for ${c.address} is active.`, linkUrl: "/contracts" }).catch(() => {});
  return res.status(200).json({ contract_id: c.contract_id, status: "active" });
};

// PATCH /contracts/:id/terminate  [landlord] — ends any open contract (e.g. a duplicate created by mistake)
const terminateContract = async (req, res) => {
  const c = await load(req, res);
  if (!c) return;
  if (["terminated", "completed"].includes(c.status)) {
    return res.status(422).json({ success: false, message: `This contract is already ${c.status}.` });
  }
  await pool.query("UPDATE contracts SET status = 'terminated', updated_at = NOW() WHERE contract_id = $1", [c.contract_id]);

  // Free the flat only if nothing else is still live on it.
  const live = await pool.query(
    "SELECT 1 FROM contracts WHERE property_id = $1 AND contract_id <> $2 AND status::text = 'active' LIMIT 1",
    [c.property_id, c.contract_id],
  );
  if (c.status === "active" && live.rows.length === 0) {
    await pool.query(
      "UPDATE properties SET availability_status = 'available', tenant_id = NULL WHERE property_id = $1 AND availability_status::text <> 'archived'",
      [c.property_id],
    );
  }
  await notify({ userId: c.tenant_id, type: "lease_terminated", title: "Contract terminated", message: `The landlord terminated the contract for ${c.address}.`, linkUrl: "/contracts" }).catch(() => {});
  return res.status(200).json({ contract_id: c.contract_id, status: "terminated" });
};

module.exports = { activateContract, terminateContract };