const pool = require("../config/db.js");
const { isoDate } = require("../utils/dateFormat.js");

// GET /landlord/properties — all non-archived properties owned by the user
const getLandlordProperties = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
              u.user_id AS owner_user_id, u.name AS owner_name,
              u.is_verified AS owner_is_verified,
              COALESCE(r.avg_rating, 0)::float AS owner_rating,
              COALESCE(
                (SELECT array_agg(pp.photo_url ORDER BY pp.photo_id)
                 FROM property_photos pp
                 WHERE pp.property_id = p.property_id),
                ARRAY[]::text[]
              ) AS photos
       FROM properties p
       JOIN users u ON u.user_id = p.owner_id
       LEFT JOIN (
         SELECT reviewed_user_id, AVG(rating) AS avg_rating
         FROM reviews
         GROUP BY reviewed_user_id
       ) r ON r.reviewed_user_id = u.user_id
       WHERE p.owner_id = $1
         AND p.availability_status != 'archived'
       ORDER BY p.property_id DESC`,
      [req.user.user_id],
    );

    const data = result.rows.map((row) => ({
      property_id: row.property_id,
      owner_id: row.owner_id,
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
      is_hidden: row.is_hidden,
      furnish_type: row.furnish_type,
      nearest_transport: row.nearest_transport,
      created_at: row.created_at,
      photos: row.photos,
      owner: {
        user_id: row.owner_user_id,
        name: row.owner_name,
        is_verified: row.owner_is_verified,
        average_rating: Number(row.owner_rating.toFixed(2)),
      },
    }));

    return res.status(200).json({ data });
  } catch (err) {
    console.error("getLandlordProperties error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch landlord properties" });
  }
};

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

// GET /landlord/stats  [landlord only]
const getLandlordStats = async (req, res) => {
  try {
    const ownerId = req.user.user_id;

    const unitsResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_units,
         COUNT(*) FILTER (WHERE tenant_id IS NOT NULL)::int AS occupied_units
       FROM properties
       WHERE owner_id = $1 AND availability_status != 'archived'`,
      [ownerId],
    );
    const { total_units, occupied_units } = unitsResult.rows[0];
    const vacant_units = total_units - occupied_units;
    const occupancy_rate_pct = total_units > 0
      ? Number(((occupied_units / total_units) * 100).toFixed(1))
      : 0;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const contractsResult = await pool.query(
      `SELECT contract_id, rate FROM contracts WHERE owner_id = $1 AND status = 'active'`,
      [ownerId],
    );

    let monthly_gross_revenue = 0;
    let totalCollected = 0;
    for (const contract of contractsResult.rows) {
      monthly_gross_revenue += Number(contract.rate);
      const paymentCheck = await pool.query(
        `SELECT amount FROM payments
         WHERE contract_id = $1 AND status = 'paid'
           AND payment_date >= $2 AND payment_date < $3
         LIMIT 1`,
        [contract.contract_id, monthStart, monthEnd],
      );
      if (paymentCheck.rows.length > 0) totalCollected += Number(paymentCheck.rows[0].amount);
    }
    const pending_rent_amount = monthly_gross_revenue - totalCollected;

    const pendingApplicationsResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM applications a
       JOIN properties p ON p.property_id = a.property_id
       WHERE p.owner_id = $1 AND a.status = 'pending'`,
      [ownerId],
    );

    const upcomingToursResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM appointments
       WHERE owner_id = $1 AND status IN ('pending', 'confirmed') AND appointment_date >= CURRENT_DATE`,
      [ownerId],
    );

    return res.status(200).json({
      total_units,
      occupied_units,
      vacant_units,
      occupancy_rate_pct,
      monthly_gross_revenue,
      pending_rent_amount,
      pending_applications: pendingApplicationsResult.rows[0].count,
      upcoming_tours: upcomingToursResult.rows[0].count,
    });
  } catch (err) {
    console.error("getLandlordStats error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch landlord stats" });
  }
};

// GET /landlord/properties  [landlord only]
const getLandlordProperties = async (req, res) => {
  try {
    const ownerId = req.user.user_id;

    const result = await pool.query(
      `SELECT p.property_id, p.address, p.rate, p.availability_status,
              c.tenant_id AS active_tenant_id, u.name AS active_tenant_name,
              u.contact_number AS active_tenant_contact,
              COALESCE(
                (SELECT COUNT(*)::int FROM appointments ap
                 WHERE ap.property_id = p.property_id AND ap.status = 'pending'),
                0
              ) AS pending_tour_requests
       FROM properties p
       LEFT JOIN contracts c ON c.property_id = p.property_id AND c.status = 'active'
       LEFT JOIN users u ON u.user_id = c.tenant_id
       WHERE p.owner_id = $1 AND p.availability_status != 'archived'
       ORDER BY p.property_id DESC`,
      [ownerId],
    );

    const data = result.rows.map((row) => ({
      property_id: row.property_id,
      address: row.address,
      rate: row.rate,
      availability_status: row.availability_status,
      active_tenant: row.active_tenant_id
        ? {
            user_id: row.active_tenant_id,
            name: row.active_tenant_name,
            contact_number: row.active_tenant_contact,
          }
        : null,
      pending_tour_requests: row.pending_tour_requests,
    }));

    return res.status(200).json({ data });
  } catch (err) {
    console.error("getLandlordProperties error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch landlord properties" });
  }
};

module.exports = { getLandlordLedger, getLandlordStats, getLandlordProperties };
