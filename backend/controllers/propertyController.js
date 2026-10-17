const pool = require("../config/db.js");
const { uploadToBucket, deleteFromBucket } = require("../utils/storage.js");

// GET /properties  — search/discovery with filters + pagination
const getProperties = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      q,
      city,
      thana,
      post_code,
      min_rate,
      max_rate,
      bedroom,
      bathroom,
      has_balcony,
      property_type,
      furnish_type,
      availability_status,
      lat,
      lng,
      radius_km,
      facilities, // comma-separated
    } = req.query;

    const where = ["p.is_hidden = FALSE", "p.availability_status != 'archived'"];
    const values = [];
    let i = 1;

    const addressSearch = (term) => {
      where.push(`p.address ILIKE $${i++}`);
      values.push(`%${term}%`);
    };

        // Every word must appear somewhere in address / details / type
    // (case-insensitive), so "gulshan dhaka" works too.
    const searchTerm = (q || req.query.search || req.query.location || "").toString().trim();
    if (searchTerm) {
      searchTerm.split(/\s+/).forEach((word) => {
        where.push(`(
          p.address ILIKE $${i}
          OR COALESCE(p.details, '') ILIKE $${i}
          OR COALESCE(p.property_type::text, '') ILIKE $${i}
        )`);
        values.push(`%${word}%`);
        i += 1;
      });
    }
    if (city) addressSearch(city);
    if (thana) addressSearch(thana);
    if (post_code) addressSearch(post_code);
    if (min_rate) { where.push(`p.rate >= $${i++}`); values.push(min_rate); }
    if (max_rate) { where.push(`p.rate <= $${i++}`); values.push(max_rate); }
    if (bedroom) { where.push(`p.bedroom = $${i++}`); values.push(bedroom); }
    if (bathroom) { where.push(`p.bathroom = $${i++}`); values.push(bathroom); }
    if (has_balcony === "yes") {
      where.push(`EXISTS (
        SELECT 1 FROM unnest(COALESCE(p.facilities, ARRAY[]::text[])) facility
        WHERE facility ILIKE '%balcony%'
      )`);
    } else if (has_balcony === "no") {
      where.push(`NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(p.facilities, ARRAY[]::text[])) facility
        WHERE facility ILIKE '%balcony%'
      )`);
    }
    if (property_type) { where.push(`p.property_type = $${i++}`); values.push(property_type); }
    if (furnish_type) { where.push(`p.furnish_type = $${i++}`); values.push(furnish_type); }
    if (availability_status) { where.push(`p.availability_status = $${i++}`); values.push(availability_status); }
    if (facilities) {
      const list = facilities.split(",").map((f) => f.trim());
      where.push(`p.facilities @> $${i++}::text[]`);
      values.push(list);
    }

    if (lat && lng && radius_km) {
      where.push(`
        (6371 * acos(
          cos(radians($${i})) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians($${i + 1})) +
          sin(radians($${i})) * sin(radians(p.latitude))
        )) <= $${i + 2}
      `);
      values.push(lat, lng, radius_km);
      i += 3;
    }

    const whereClause = `WHERE ${where.join(" AND ")}`;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 12, 1);
    const offset = (pageNum - 1) * limitNum;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM properties p ${whereClause}`,
      values,
    );
    const total = countResult.rows[0].total;

    values.push(limitNum, offset);
    const dataResult = await pool.query(
      `
      SELECT p.*,
             u.user_id AS owner_user_id, u.name AS owner_name,
             u.is_verified AS owner_is_verified,
             COALESCE(r.avg_rating, 0)::float AS owner_rating,
             COALESCE(
               (SELECT array_agg(pp.photo_url ORDER BY pp.photo_id)
                FROM property_photos pp WHERE pp.property_id = p.property_id),
               ARRAY[]::text[]
             ) AS photos
      FROM properties p
      JOIN users u ON u.user_id = p.owner_id
      LEFT JOIN (
        SELECT reviewed_user_id, AVG(rating) AS avg_rating
        FROM reviews GROUP BY reviewed_user_id
      ) r ON r.reviewed_user_id = u.user_id
      ${whereClause}
      ORDER BY p.property_id DESC
      LIMIT $${i} OFFSET $${i + 1}
      `,
      values,
    );

    const data = dataResult.rows.map((row) => ({
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
      photos: row.photos, // property-photos bucket is public — stored as full URLs already
      owner: {
        user_id: row.owner_user_id,
        name: row.owner_name,
        is_verified: row.owner_is_verified,
        rating: Number(row.owner_rating.toFixed(2)),
      },
    }));

    return res.status(200).json({
      data,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum) || 0,
      },
    });
  } catch (err) {
    console.error("getProperties error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch properties" });
  }
};

// GET /properties/:id — full detail
const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Property id must be a positive integer",
      });
    }

    const propResult = await pool.query(
      `SELECT p.*, u.user_id AS owner_user_id, u.name AS owner_name,
              u.contact_number AS owner_contact_number, u.is_verified AS owner_is_verified,
              COALESCE(r.avg_rating, 0)::float AS owner_rating
       FROM properties p
       JOIN users u ON u.user_id = p.owner_id
       LEFT JOIN (
         SELECT reviewed_user_id, AVG(rating) AS avg_rating
         FROM reviews GROUP BY reviewed_user_id
       ) r ON r.reviewed_user_id = u.user_id
       WHERE p.property_id = $1 AND p.availability_status != 'archived'`,
      [id],
    );

    if (propResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Property with id ${id} not found` });
    }
    const row = propResult.rows[0];

    const photosResult = await pool.query(
      "SELECT photo_id, photo_url FROM property_photos WHERE property_id = $1 ORDER BY photo_id",
      [id],
    );

    return res.status(200).json({
      property_id: row.property_id,
      owner_id: row.owner_id,
      tenant_id: row.tenant_id,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      details: row.details,
      facilities: row.facilities,
      rate: row.rate,
      deposit: row.deposit,
      property_type: row.property_type,
      bedroom: row.bedroom,
      bathroom: row.bathroom,
      size_sqft: row.size_sqft,
      floor: row.floor,
      total_floors: row.total_floors,
      availability_date: row.availability_date,
      availability_status: row.availability_status,
      furnish_type: row.furnish_type,
      nearest_transport: row.nearest_transport,
      photos: photosResult.rows,
      owner: {
        user_id: row.owner_user_id,
        name: row.owner_name,
        contact_number: row.owner_contact_number,
        is_verified: row.owner_is_verified,
        average_rating: Number(row.owner_rating.toFixed(2)),
      },
    });
  } catch (err) {
    console.error("getPropertyById error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch property" });
  }
};

// POST /properties  [landlord only]
const CREATE_FIELDS = [
  "address", "latitude", "longitude", "details", "facilities", "rate", "deposit",
  "property_type", "bedroom", "bathroom", "size_sqft", "floor", "total_floors",
  "availability_date", "furnish_type", "nearest_transport",
];

const createProperty = async (req, res) => {
  try {
    const ownerId = req.user.user_id;
    const body = req.body || {};

    if (!body.address || !body.rate || !body.property_type) {
      return res.status(422).json({ success: false, message: "address, rate, and property_type are required" });
    }

    const columns = ["owner_id"];
    const placeholders = ["$1"];
    const values = [ownerId];
    let i = 2;

    for (const field of CREATE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        columns.push(field);
        placeholders.push(`$${i++}`);
        values.push(body[field]);
      }
    }

    // RETURNING * so the caller gets a row the UI can render directly.
    // Returning only the old five columns made every freshly created
    // listing come back with no photos and no landlord, so the card the
    // landlord lands on was blank until a full page reload.
    const query = `
      INSERT INTO properties (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *`;

    const result = await pool.query(query, values);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createProperty error: ", err);
    if (err.code === "22P02") return res.status(400).json({ success: false, message: "Invalid enum value (property_type/furnish_type)" });
    return res.status(500).json({ success: false, message: "Failed to create property" });
  }
};

// PATCH /properties/:id  [landlord only, must own the property]
const UPDATE_FIELDS = [
  "address", "latitude", "longitude", "details", "facilities", "rate", "deposit",
  "property_type", "bedroom", "bathroom", "size_sqft", "floor", "total_floors",
  "availability_date", "availability_status", "furnish_type", "nearest_transport", "tenant_id",
];

const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.user_id;
    const body = req.body || {};

    const ownCheck = await pool.query(
      "SELECT owner_id FROM properties WHERE property_id = $1 AND availability_status != 'archived'",
      [id],
    );
    if (ownCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Property with id ${id} not found` });
    }
    if (ownCheck.rows[0].owner_id !== ownerId && !req.user.is_admin) {
      return res.status(403).json({ success: false, message: "You do not own this property" });
    }

    const setClauses = [];
    const values = [];
    let i = 1;
    for (const field of UPDATE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        setClauses.push(`${field} = $${i++}`);
        values.push(body[field]);
      }
    }
    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields provided to update", allowedFields: UPDATE_FIELDS });
    }

    setClauses.push("updated_at = NOW()");
    values.push(id);
    // RETURNING * for the same reason createProperty does: the thin
    // response left the edited card rendering stale values, because the
    // landlord's own listing still showed the old rate and status.
    const result = await pool.query(
      `UPDATE properties SET ${setClauses.join(", ")} WHERE property_id = $${i} RETURNING *`,
      values,
    );
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("updateProperty error: ", err);
    if (err.code === "22P02") return res.status(400).json({ success: false, message: "Invalid enum value" });
    return res.status(500).json({ success: false, message: "Failed to update property" });
  }
};

// PATCH /properties/:id/visibility  { is_hidden }
// The dashboard has always shipped a Hide/Show toggle that calls this,
// but no route existed — the request 404'd and the listing never hid.
// Kept off UPDATE_FIELDS on purpose: hiding a listing is a listing-level
// action, not one of the editable listing details.
const setPropertyVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.user_id;

    const ownCheck = await pool.query(
      "SELECT owner_id FROM properties WHERE property_id = $1 AND availability_status != 'archived'",
      [id],
    );
    if (ownCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Property with id ${id} not found` });
    }
    if (ownCheck.rows[0].owner_id !== ownerId && !req.user.is_admin) {
      return res.status(403).json({ success: false, message: "You do not own this property" });
    }

    // Absence is ambiguous — an omitted body could mean "leave it alone"
    // or "unset it" — so require the flag explicitly rather than
    // defaulting to one and silently flipping a listing.
    if (typeof req.body?.is_hidden !== "boolean") {
      return res.status(422).json({ success: false, message: "is_hidden must be a boolean" });
    }

    const result = await pool.query(
      "UPDATE properties SET is_hidden = $1, updated_at = NOW() WHERE property_id = $2 RETURNING property_id, is_hidden",
      [req.body.is_hidden, id],
    );
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("setPropertyVisibility error: ", err);
    return res.status(500).json({ success: false, message: "Failed to update visibility" });
  }
};

// DELETE /properties/:id — soft delete: mark status archived
const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.user_id;

    const ownCheck = await pool.query(
      "SELECT owner_id FROM properties WHERE property_id = $1 AND availability_status != 'archived'",
      [id],
    );
    if (ownCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Property with id ${id} not found` });
    }
    if (ownCheck.rows[0].owner_id !== ownerId && !req.user.is_admin) {
      return res.status(403).json({ success: false, message: "You do not own this property" });
    }

    await pool.query(
      "UPDATE properties SET availability_status = 'archived', updated_at = NOW() WHERE property_id = $1",
      [id],
    );
    return res.status(204).send();
  } catch (err) {
    console.error("deleteProperty error: ", err);
    return res.status(500).json({ success: false, message: "Failed to delete property" });
  }
};

// POST /properties/:id/photos  [landlord only, owner]
const uploadPropertyPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.user_id;
    const files = req.files || [];

    const ownCheck = await pool.query(
      "SELECT owner_id FROM properties WHERE property_id = $1 AND availability_status != 'archived'",
      [id],
    );
    if (ownCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Property with id ${id} not found` });
    }
    if (ownCheck.rows[0].owner_id !== ownerId && !req.user.is_admin) {
      return res.status(403).json({ success: false, message: "You do not own this property" });
    }
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: "No photo files uploaded" });
    }

    const uploaded = [];
    for (const file of files) {
      const ext = file.originalname.split(".").pop();
      const path = `properties/${id}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const { url } = await uploadToBucket("property-photos", path, file.buffer, file.mimetype);
      const result = await pool.query(
        "INSERT INTO property_photos (property_id, photo_url) VALUES ($1, $2) RETURNING photo_id, photo_url",
        [id, url],
      );
      uploaded.push(result.rows[0]);
    }

    return res.status(201).json({ uploaded });
  } catch (err) {
    console.error("uploadPropertyPhotos error: ", err);
    return res.status(500).json({ success: false, message: "Failed to upload photos" });
  }
};

// DELETE /properties/:id/photos/:photo_id
const deletePropertyPhoto = async (req, res) => {
  try {
    const { id, photo_id } = req.params;
    const ownerId = req.user.user_id;

    const ownCheck = await pool.query(
      "SELECT owner_id FROM properties WHERE property_id = $1",
      [id],
    );
    if (ownCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Property with id ${id} not found` });
    }
    if (ownCheck.rows[0].owner_id !== ownerId && !req.user.is_admin) {
      return res.status(403).json({ success: false, message: "You do not own this property" });
    }

    const result = await pool.query(
      "DELETE FROM property_photos WHERE photo_id = $1 AND property_id = $2 RETURNING photo_id, photo_url",
      [photo_id, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Photo not found on this property" });
    }

    // Best-effort cleanup in the bucket so deleted photos don't linger as orphaned storage.
    try {
      const url = result.rows[0].photo_url;
      const marker = "/object/public/property-photos/";
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        await deleteFromBucket("property-photos", url.slice(idx + marker.length));
      }
    } catch (cleanupErr) {
      console.error("deletePropertyPhoto storage cleanup error: ", cleanupErr);
    }

    return res.status(204).send();
  } catch (err) {
    console.error("deletePropertyPhoto error: ", err);
    return res.status(500).json({ success: false, message: "Failed to delete photo" });
  }
};

// PATCH /properties/:id/visibility  [landlord only, must own the property]
const updatePropertyVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.user_id;
    const { is_hidden } = req.body || {};

    if (typeof is_hidden !== "boolean") {
      return res.status(422).json({ success: false, message: "is_hidden (boolean) is required" });
    }

    const ownCheck = await pool.query(
      "SELECT owner_id FROM properties WHERE property_id = $1 AND availability_status != 'archived'",
      [id],
    );
    if (ownCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Property with id ${id} not found` });
    }
    if (ownCheck.rows[0].owner_id !== ownerId && !req.user.is_admin) {
      return res.status(403).json({ success: false, message: "You do not own this property" });
    }

    const result = await pool.query(
      "UPDATE properties SET is_hidden = $1, updated_at = NOW() WHERE property_id = $2 RETURNING property_id, is_hidden",
      [is_hidden, id],
    );
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("updatePropertyVisibility error: ", err);
    return res.status(500).json({ success: false, message: "Failed to update property visibility" });
  }
};

module.exports = {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  setPropertyVisibility,
  uploadPropertyPhotos,
  deletePropertyPhoto,
  updatePropertyVisibility,
};