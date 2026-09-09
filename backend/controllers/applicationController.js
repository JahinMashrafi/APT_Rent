const pool = require("../config/db.js");
const { notify } = require("../utils/notify.js");

// POST /applications  [tenant only]
const createApplication = async (req, res) => {
  try {
    const tenantId = req.user.user_id;
    const { property_id, monthly_income, occupation, family_size, message } = req.body || {};

    if (!property_id || !monthly_income || !family_size) {
      return res.status(422).json({ success: false, message: "property_id, monthly_income, and family_size are required" });
    }

    const propCheck = await pool.query(
      "SELECT property_id, owner_id FROM properties WHERE property_id = $1 AND availability_status != 'archived'",
      [property_id],
    );
    if (propCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    const result = await pool.query(
      `INSERT INTO applications (property_id, tenant_id, monthly_income, occupation, family_size, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING application_id, property_id, tenant_id, status, created_at`,
      [property_id, tenantId, monthly_income, occupation, family_size, message],
    );

    await notify({
      userId: propCheck.rows[0].owner_id,
      type: "application_received",
      title: "New rental application",
      message: `A tenant applied for your property (application #${result.rows[0].application_id}).`,
      linkUrl: `/applications/${result.rows[0].application_id}`,
    });

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createApplication error: ", err);
    return res.status(500).json({ success: false, message: "Failed to submit application" });
  }
};

// GET /applications  [auth required] — landlords see inbound, tenants see their own
const listApplications = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const isLandlord = req.user.is_landlord;

    const query = isLandlord
      ? `SELECT a.application_id, a.property_id, p.address AS property_address, a.status,
                a.monthly_income, a.occupation, a.family_size, a.message, a.created_at,
                u.user_id, u.name, u.contact_number, u.is_verified
         FROM applications a
         JOIN properties p ON p.property_id = a.property_id
         JOIN users u ON u.user_id = a.tenant_id
         WHERE p.owner_id = $1
         ORDER BY a.created_at DESC`
      : `SELECT a.application_id, a.property_id, p.address AS property_address, a.status,
                a.monthly_income, a.occupation, a.family_size, a.message, a.created_at,
                u.user_id, u.name, u.contact_number, u.is_verified
         FROM applications a
         JOIN properties p ON p.property_id = a.property_id
         JOIN users u ON u.user_id = a.tenant_id
         WHERE a.tenant_id = $1
         ORDER BY a.created_at DESC`;

    const result = await pool.query(query, [userId]);

    const data = result.rows.map((row) => ({
      application_id: row.application_id,
      property_id: row.property_id,
      property_address: row.property_address,
      status: row.status,
      monthly_income: row.monthly_income,
      occupation: row.occupation,
      family_size: row.family_size,
      message: row.message,
      tenant: {
        user_id: row.user_id,
        name: row.name,
        contact_number: row.contact_number,
        is_verified: row.is_verified,
      },
      created_at: row.created_at,
    }));

    return res.status(200).json({ data });
  } catch (err) {
    console.error("listApplications error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch applications" });
  }
};

// PATCH /applications/:id/status  [landlord only, must own the property]
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ["pending", "reviewed", "approved", "rejected"];
    if (!allowed.includes(status)) {
      return res.status(422).json({ success: false, message: `status must be one of: ${allowed.join(", ")}` });
    }

    const appResult = await pool.query(
      `SELECT a.application_id, a.tenant_id, p.owner_id, p.address
       FROM applications a JOIN properties p ON p.property_id = a.property_id
       WHERE a.application_id = $1`,
      [id],
    );
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    const app = appResult.rows[0];
    if (app.owner_id !== req.user.user_id && !req.user.is_admin) {
      return res.status(403).json({ success: false, message: "You do not own this property" });
    }

    const result = await pool.query(
      "UPDATE applications SET status = $1, updated_at = NOW() WHERE application_id = $2 RETURNING application_id, status, updated_at",
      [status, id],
    );

    await notify({
      userId: app.tenant_id,
      type: "application_status_changed",
      title: "Application update",
      message: `Your application for ${app.address} was marked "${status}".`,
      linkUrl: `/applications/${id}`,
    });

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("updateApplicationStatus error: ", err);
    return res.status(500).json({ success: false, message: "Failed to update application" });
  }
};

module.exports = { createApplication, listApplications, updateApplicationStatus };