const pool = require("../config/db.js");
const { notify } = require("../utils/notify.js");

const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["open", "in_progress", "resolved", "cancelled"];

// `$1` is the signed-in user, so every row says whether they created it.
const MAINT_SELECT = `
  SELECT m.maintenance_id, m.contract_id, m.property_id, p.address AS property_address,
         m.created_by, cu.name AS created_by_name,
         m.recipient_id, ru.name AS recipient_name,
         k.owner_id, k.tenant_id,
         m.kind, m.title, m.description, m.priority, m.status,
         m.scheduled_date::text AS scheduled_date, m.response_notes,
         m.created_at, m.updated_at, m.resolved_at,
         (m.created_by = $1) AS created_by_me,
         (m.recipient_id = $1) AS for_me
    FROM maintenance_requests m
    JOIN contracts k ON k.contract_id = m.contract_id
    JOIN properties p ON p.property_id = m.property_id
    JOIN users cu ON cu.user_id = m.created_by
    JOIN users ru ON ru.user_id = m.recipient_id`;

const shape = (row, viewerId) => ({
  maintenance_id: row.maintenance_id,
  contract_id: row.contract_id,
  property_id: row.property_id,
  property_address: row.property_address,
  created_by: { user_id: row.created_by, name: row.created_by_name },
  recipient: { user_id: row.recipient_id, name: row.recipient_name },
  kind: row.kind,
  title: row.title,
  description: row.description,
  priority: row.priority,
  status: row.status,
  scheduled_date: row.scheduled_date,
  response_notes: row.response_notes,
  created_at: row.created_at,
  updated_at: row.updated_at,
  resolved_at: row.resolved_at,
  created_by_me: row.created_by_me,
  for_me: row.for_me,
  // What the viewer may do next (the UI just renders these).
  allowed_statuses: allowedStatuses(row, viewerId),
});

// Landlord (contract owner) runs the work; the author may withdraw their
// own record. Resolved/cancelled are final.
function allowedStatuses(row, viewerId) {
  if (row.status === "resolved" || row.status === "cancelled") return [];
  const out = [];
  if (row.owner_id === viewerId) {
    if (row.status === "open") out.push("in_progress");
    out.push("resolved", "cancelled");
  } else if (row.created_by === viewerId) {
    out.push("cancelled");
  }
  return out;
}

const safeNotify = async (payload) => {
  try {
    await notify(payload);
  } catch (err) {
    console.error("maintenance notify error: ", err);
  }
};

// GET /maintenance  [auth] — records the user created or that are addressed to them.
const listMaintenance = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await pool.query(
      `${MAINT_SELECT}
        WHERE m.created_by = $1 OR m.recipient_id = $1
        ORDER BY CASE WHEN m.status IN ('open', 'in_progress') THEN 0 ELSE 1 END, m.created_at DESC`,
      [userId],
    );
    return res.status(200).json({ data: result.rows.map((r) => shape(r, userId)) });
  } catch (err) {
    console.error("listMaintenance error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch maintenance records" });
  }
};

const loadForParty = async (id, userId) => {
  if (!Number.isInteger(id)) return null;
  const result = await pool.query(`${MAINT_SELECT} WHERE m.maintenance_id = $2`, [userId, id]);
  const row = result.rows[0];
  if (!row) return null;
  // Admins may view any record; everyone else must be a party.
  if (!row.created_by_me && !row.for_me) {
    const admin = await pool.query("SELECT is_admin FROM users WHERE user_id = $1", [userId]);
    if (!admin.rows[0]?.is_admin) return null;
  }
  return row;
};

// GET /maintenance/:id  [auth, party or admin]
const getMaintenance = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const row = await loadForParty(Number(req.params.id), userId);
    if (!row) return res.status(404).json({ success: false, message: "Maintenance record not found" });
    return res.status(200).json({ data: shape(row, userId) });
  } catch (err) {
    console.error("getMaintenance error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch maintenance record" });
  }
};

// POST /maintenance  [auth]
// The contract decides the direction: the tenant of an active lease files a
// 'request' to the landlord; its owner sends a 'notice' to the tenant.
const createMaintenance = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { contract_id, title, description, priority = "medium", scheduled_date } = req.body || {};

    if (!contract_id || !title || !String(title).trim() || !description || !String(description).trim()) {
      return res.status(400).json({ success: false, message: "contract_id, title, and description are required" });
    }
    if (String(title).trim().length > 150) {
      return res.status(400).json({ success: false, message: "title must be 150 characters or fewer" });
    }
    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({ success: false, message: `priority must be one of ${PRIORITIES.join(", ")}` });
    }

    const contract = await pool.query(
      "SELECT contract_id, property_id, owner_id, tenant_id, status::text AS status FROM contracts WHERE contract_id = $1",
      [contract_id],
    );
    const c = contract.rows[0];
    if (!c || (c.owner_id !== userId && c.tenant_id !== userId)) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }
    if (c.status !== "active") {
      return res.status(422).json({ success: false, message: "Maintenance can only be raised on an active lease" });
    }

    const isLandlord = c.owner_id === userId;
    const kind = isLandlord ? "notice" : "request";
    const recipientId = isLandlord ? c.tenant_id : c.owner_id;

    let scheduled = null;
    if (scheduled_date) {
      if (!isLandlord) {
        return res.status(400).json({ success: false, message: "Only notices can have a scheduled date" });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date) || Number.isNaN(Date.parse(scheduled_date))) {
        return res.status(400).json({ success: false, message: "scheduled_date must be YYYY-MM-DD" });
      }
      scheduled = scheduled_date;
    }

    const result = await pool.query(
      `INSERT INTO maintenance_requests
         (contract_id, property_id, created_by, recipient_id, kind, title, description, priority, scheduled_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING maintenance_id, status, kind`,
      [c.contract_id, c.property_id, userId, recipientId, kind, String(title).trim(), String(description).trim(), priority, scheduled],
    );
    const row = result.rows[0];

    await safeNotify({
      userId: recipientId,
      type: kind === "notice" ? "maintenance_notice" : "maintenance_request",
      title: kind === "notice" ? "New maintenance notice" : "New maintenance request",
      message: `Maintenance #${row.maintenance_id}: ${String(title).trim()}`,
      linkUrl: `/maintenance/${row.maintenance_id}`,
    });

    return res.status(201).json(row);
  } catch (err) {
    console.error("createMaintenance error: ", err);
    return res.status(500).json({ success: false, message: "Failed to create maintenance record" });
  }
};

// PATCH /maintenance/:id/status  [auth, party]
const updateMaintenanceStatus = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { status, response_notes } = req.body || {};
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of ${STATUSES.join(", ")}` });
    }

    const row = await loadForParty(Number(req.params.id), userId);
    // Admins can read any record but only the two parties may change it.
    if (!row || (!row.created_by_me && !row.for_me)) {
      return res.status(404).json({ success: false, message: "Maintenance record not found" });
    }
    if (!allowedStatuses(row, userId).includes(status)) {
      return res.status(403).json({ success: false, message: "You cannot move this record to that status" });
    }

    const notes = response_notes && String(response_notes).trim() ? String(response_notes).trim() : null;
    const done = status === "resolved" || status === "cancelled";
    await pool.query(
      `UPDATE maintenance_requests
          SET status = $1,
              response_notes = COALESCE($2, response_notes),
              updated_at = now(),
              resolved_at = CASE WHEN $3 THEN now() ELSE resolved_at END
        WHERE maintenance_id = $4`,
      [status, notes, done, row.maintenance_id],
    );

    // Tell the other party.
    const otherId = row.created_by === userId ? row.recipient_id : row.created_by;
    await safeNotify({
      userId: otherId,
      type: "maintenance_update",
      title: "Maintenance update",
      message: `Maintenance #${row.maintenance_id} was marked "${status}".`,
      linkUrl: `/maintenance/${row.maintenance_id}`,
    });

    return res.status(200).json({ maintenance_id: row.maintenance_id, status });
  } catch (err) {
    console.error("updateMaintenanceStatus error: ", err);
    return res.status(500).json({ success: false, message: "Failed to update maintenance record" });
  }
};

module.exports = { listMaintenance, getMaintenance, createMaintenance, updateMaintenanceStatus };