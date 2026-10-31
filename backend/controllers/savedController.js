const pool = require("../config/db.js");
const AppError = require("../utils/AppError.js");

const parseId = (value) => {
  if (!/^[1-9]\d{0,9}$/.test(String(value))) throw AppError.validation("Property id must be a positive integer.");
  return Number(value);
};

// GET /saved — full cards for the signed-in user's saved listings (newest first)
const listSaved = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, sp.created_at AS saved_at,
            u.user_id AS owner_user_id, u.name AS owner_name, u.is_verified AS owner_is_verified,
            COALESCE(
              (SELECT array_agg(pp.photo_url ORDER BY pp.photo_id)
                 FROM property_photos pp WHERE pp.property_id = p.property_id),
              ARRAY[]::text[]
            ) AS photos
       FROM saved_properties sp
       JOIN properties p ON p.property_id = sp.property_id
       JOIN users u ON u.user_id = p.owner_id
      WHERE sp.user_id = $1
      ORDER BY sp.created_at DESC`,
    [req.user.user_id],
  );

  const data = rows.map((row) => ({
    property_id: row.property_id,
    owner_id: row.owner_id,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    rate: row.rate,
    deposit: row.deposit,
    property_type: row.property_type,
    bedroom: row.bedroom,
    bathroom: row.bathroom,
    size_sqft: row.size_sqft,
    furnish_type: row.furnish_type,
    facilities: row.facilities,
    availability_status: row.availability_status,
    created_at: row.created_at,
    saved_at: row.saved_at,
    // Hidden/archived listings stay in the list (so the user notices) but are flagged.
    is_unavailable: Boolean(row.is_hidden) || row.availability_status === "archived",
    photos: row.photos,
    owner: { user_id: row.owner_user_id, name: row.owner_name, is_verified: row.owner_is_verified },
  }));
  return res.status(200).json({ data });
};

// GET /saved/ids — just the ids, used to paint the heart on every card
const listSavedIds = async (req, res) => {
  const { rows } = await pool.query(
    "SELECT property_id FROM saved_properties WHERE user_id = $1",
    [req.user.user_id],
  );
  return res.status(200).json({ data: rows.map((r) => r.property_id) });
};

// POST /saved/:propertyId — idempotent
const saveProperty = async (req, res) => {
  const propertyId = parseId(req.params.propertyId);
  const exists = await pool.query(
    "SELECT 1 FROM properties WHERE property_id = $1 AND availability_status != 'archived'",
    [propertyId],
  );
  if (exists.rows.length === 0) throw AppError.notFound("Property not found.");

  await pool.query(
    `INSERT INTO saved_properties (user_id, property_id) VALUES ($1, $2)
     ON CONFLICT (user_id, property_id) DO NOTHING`,
    [req.user.user_id, propertyId],
  );
  return res.status(201).json({ property_id: propertyId, saved: true });
};

// DELETE /saved/:propertyId — idempotent
const unsaveProperty = async (req, res) => {
  const propertyId = parseId(req.params.propertyId);
  await pool.query(
    "DELETE FROM saved_properties WHERE user_id = $1 AND property_id = $2",
    [req.user.user_id, propertyId],
  );
  return res.status(200).json({ property_id: propertyId, saved: false });
};

module.exports = { listSaved, listSavedIds, saveProperty, unsaveProperty };