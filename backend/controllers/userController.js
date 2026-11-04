const { getReviewEligibility } = require("../utils/reviewEligibility.js");
const pool = require("../config/db.js");
const path = require("path");
const AppError = require("../utils/AppError.js");
const { uploadToBucket, deleteFromBucket } = require("../utils/storage.js");
const { detectImageType } = require("../utils/imageType.js");
const { signFields, USER_SIGNED_FIELDS } = require("../utils/signFields.js");

// ---- Admin-facing list/update/delete ----

const UPDATABLE_FIELDS = [
  "name",
  "email",
  "contact_number",
  "profile_picture_url",
  "nid_photo_url",
  "address",
  "occupation",
  "institution_name",
  "student_id_card_url",
  "workplace_name",
  "job_id_card_url",
  "trade_license_url",
  "is_verified",
  "is_tenant",
  "is_landlord",
];

// GET /api/users
// GET /api/users?role=tenant|landlord|admin (maps to boolean columns)
const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = "SELECT * FROM users";
    const params = [];

    if (role === "tenant") query += " WHERE is_tenant = TRUE";
    else if (role === "landlord") query += " WHERE is_landlord = TRUE";
    else if (role === "admin") query += " WHERE is_admin = TRUE";

    query += " ORDER BY user_id ASC";
    const result = await pool.query(query, params);
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error("Get users error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const setClauses = [];
    const values = [];
    let i = 1;

    for (const field of UPDATABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        setClauses.push(`${field} = $${i}`);
        values.push(body[field]);
        i++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields provided to update", allowedFields: UPDATABLE_FIELDS });
    }

    values.push(id);
    const query = `UPDATE users SET ${setClauses.join(", ")} WHERE user_id = $${i} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }
    return res.status(200).json({ success: true, message: "User updated successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Update user error: ", err);
    if (err.code === "23505") return res.status(409).json({ success: false, message: "Email or contact number already in use" });
    if (err.code === "22P02") return res.status(400).json({ success: false, message: "Invalid field value" });
    return res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM users WHERE user_id = $1 RETURNING user_id, name, email",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }
    return res.status(200).json({ success: true, message: "User deleted successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Delete user error: ", err);
    return res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

// ---- Authentication & User Identity spec endpoints ----

const OCCUPATIONS = ["student", "service_holder", "businessman", "unemployed", "retired", "other"];

// Upload field name -> users column. Documents live in the private
// "verification-docs" bucket; the column holds the storage path.
const DOC_COLUMNS = {
  nid_photo: "nid_photo_url",
  student_id_card: "student_id_card_url",
  job_id_card: "job_id_card_url",
  trade_license: "trade_license_url",
};

// Documents required before a profile is sent to admin review.
const REQUIRED_DOCS = {
  student: ["nid_photo", "student_id_card"],
  service_holder: ["nid_photo", "job_id_card"],
  businessman: ["nid_photo", "trade_license"],
};
const requiredDocsFor = (occupation) => REQUIRED_DOCS[occupation] || ["nid_photo"];

const DOC_CONTENT_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

const ME_COLUMNS = `user_id, name, email, contact_number, address, occupation,
  institution_name, workplace_name, monthly_income, family_size, profile_picture_url, nid_photo_url,
  student_id_card_url, job_id_card_url, trade_license_url,
  is_verified, is_tenant, is_landlord, is_admin, documents_submitted_at`;

const emptyToNull = (value) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

// Where the user's verification stands, derived the same way the admin queue does:
// a decision only counts if it is newer than the latest document upload.
const buildVerification = async (row) => {
  const required = requiredDocsFor(row.occupation);
  const missing = required.filter((field) => !row[DOC_COLUMNS[field]]);

  let status = "not_submitted";
  let rejectionReason = null;
  if (row.is_verified) {
    status = "verified";
  } else if (row.documents_submitted_at) {
    const review = await pool.query(
      `SELECT decision, reason FROM verification_reviews
        WHERE user_id = $1 AND created_at >= $2
        ORDER BY created_at DESC LIMIT 1`,
      [row.user_id, row.documents_submitted_at],
    );
    if (review.rows[0]?.decision === "rejected") {
      status = "rejected";
      rejectionReason = review.rows[0].reason;
    } else {
      status = "pending";
    }
  }

  return {
    status,
    submitted_at: row.documents_submitted_at,
    rejection_reason: rejectionReason,
    occupation_set: Boolean(row.occupation),
    required_documents: required,
    missing_documents: missing,
  };
};

// The owner's full record. Document columns come back as short-lived signed
// URLs, and this is the ONLY place they are ever returned.
const loadMe = async (userId) => {
  const result = await pool.query(`SELECT ${ME_COLUMNS} FROM users WHERE user_id = $1`, [userId]);
  if (result.rows.length === 0) throw AppError.notFound("User not found");
  const row = result.rows[0];
  const verification = await buildVerification(row);
  const user = await signFields(row, USER_SIGNED_FIELDS);
  return { ...user, verification };
};

// GET /users/me
const getMe = async (req, res) => {
  return res.status(200).json(await loadMe(req.user.user_id));
};

// PATCH /users/me
// Email is intentionally not editable here, and the profile picture has its own
// upload endpoints, so neither is accepted in this body.
const updateMe = async (req, res) => {
  const userId = req.user.user_id;
  const body = req.body || {};
  const has = (field) => Object.prototype.hasOwnProperty.call(body, field);

  const current = (await pool.query("SELECT occupation, institution_name, workplace_name FROM users WHERE user_id = $1", [userId])).rows[0];
  if (!current) throw AppError.notFound("User not found");

  const sets = [];
  const values = [];
  const details = [];
  const push = (column, value) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  if (has("name")) {
    const name = emptyToNull(body.name);
    if (!name) details.push({ field: "name", issue: "Name can't be empty." });
    else if (name.length > 150) details.push({ field: "name", issue: "Name must be 150 characters or fewer." });
    else push("name", name);
  }

  if (has("contact_number")) {
    const phone = emptyToNull(body.contact_number);
    if (!phone) details.push({ field: "contact_number", issue: "Contact number can't be empty." });
    else if (phone.length > 20) details.push({ field: "contact_number", issue: "Contact number must be 20 characters or fewer." });
    else push("contact_number", phone);
  }

  if (has("address")) push("address", emptyToNull(body.address));

  let occupation = current.occupation;
  if (has("occupation")) {
    occupation = emptyToNull(body.occupation);
    if (occupation !== null && !OCCUPATIONS.includes(occupation)) {
      details.push({ field: "occupation", issue: `Must be one of: ${OCCUPATIONS.join(", ")}.` });
    } else {
      push("occupation", occupation);
    }
  }

  // Institution only applies to students; workplace/business name to service holders and businessmen.
  // Fields that no longer apply after an occupation change are cleared.
  const takesInstitution = occupation === "student";
  const takesWorkplace = occupation === "service_holder" || occupation === "businessman";
  const institution = takesInstitution ? (has("institution_name") ? emptyToNull(body.institution_name) : current.institution_name) : null;
  const workplace = takesWorkplace ? (has("workplace_name") ? emptyToNull(body.workplace_name) : current.workplace_name) : null;
  if (institution && institution.length > 200) details.push({ field: "institution_name", issue: "Must be 200 characters or fewer." });
  if (workplace && workplace.length > 200) details.push({ field: "workplace_name", issue: "Must be 200 characters or fewer." });
  if (has("occupation") || has("institution_name")) push("institution_name", institution);
  if (has("occupation") || has("workplace_name")) push("workplace_name", workplace);

  if (has("monthly_income")) {
    const raw = body.monthly_income;
    if (raw === null || raw === undefined || String(raw).trim() === "") {
      push("monthly_income", null);
    } else {
      const income = Number(raw);
      if (!Number.isFinite(income) || income < 0 || income > 1e10) details.push({ field: "monthly_income", issue: "Enter a valid monthly income (0 or more)." });
      else push("monthly_income", income);
    }
  }

  if (has("family_size")) {
    const raw = body.family_size;
    if (raw === null || raw === undefined || String(raw).trim() === "") {
      push("family_size", null);
    } else {
      const size = Number(raw);
      if (!Number.isInteger(size) || size < 1 || size > 50) details.push({ field: "family_size", issue: "Family size must be a whole number from 1 to 50." });
      else push("family_size", size);
    }
  }

  if (has("is_tenant")) push("is_tenant", Boolean(body.is_tenant));
  if (has("is_landlord")) push("is_landlord", Boolean(body.is_landlord));

  if (details.length) throw AppError.validation("Invalid field value provided.", details);
  if (sets.length === 0) throw AppError.validation("No valid fields provided to update.");

  values.push(userId);
  try {
    await pool.query(`UPDATE users SET ${sets.join(", ")}, updated_at = NOW() WHERE user_id = $${values.length}`, values);
  } catch (err) {
    if (err.code === "23505") throw AppError.conflict("Contact number already in use.", [{ field: "contact_number", issue: "Already used by another account." }]);
    throw err;
  }

  // Return the full record so the form never has to guess what was saved.
  return res.status(200).json(await loadMe(userId));
};

// POST /users/me/documents  (multipart/form-data)
// Files can be uploaded in several requests. The profile only goes to the admin
// queue (documents_submitted_at is set) once every document required for the
// user's occupation is on file.
const uploadDocuments = async (req, res) => {
  const userId = req.user.user_id;
  const files = req.files || {};

  const found = await pool.query(
    `SELECT occupation, is_verified, nid_photo_url, student_id_card_url, job_id_card_url, trade_license_url
       FROM users WHERE user_id = $1`,
    [userId],
  );
  if (found.rows.length === 0) throw AppError.notFound("User not found");
  const current = found.rows[0];

  if (current.is_verified) throw AppError.conflict("Your account is already verified.");
  if (!current.occupation) throw AppError.businessRule("Select and save your occupation before uploading documents.");

  const required = requiredDocsFor(current.occupation);
  const sent = Object.keys(DOC_COLUMNS).filter((field) => files[field]?.[0]);
  if (sent.length === 0) {
    throw AppError.validation("No document files were uploaded.", [{ field: "documents", issue: "Attach at least one file." }]);
  }
  const notNeeded = sent.filter((field) => !required.includes(field));
  if (notNeeded.length) {
    throw AppError.validation("Some documents aren't needed for your occupation.", notNeeded.map((field) => ({ field, issue: "Not required for your occupation." })));
  }

  const updates = {};
  const replacedPaths = [];
  for (const field of sent) {
    const file = files[field][0];
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    const storagePath = `users/${userId}/${field}-${Date.now()}.${ext}`;
    const { path: stored } = await uploadToBucket("verification-docs", storagePath, file.buffer, DOC_CONTENT_TYPES[ext] || "application/octet-stream");
    updates[DOC_COLUMNS[field]] = stored;
    if (current[DOC_COLUMNS[field]]) replacedPaths.push(current[DOC_COLUMNS[field]]);
  }

  const merged = { ...current, ...updates };
  const missing = required.filter((field) => !merged[DOC_COLUMNS[field]]);
  const submitted = missing.length === 0;

  const columns = Object.keys(updates);
  const setSql = columns.map((column, i) => `${column} = $${i + 1}`);
  if (submitted) setSql.push("documents_submitted_at = NOW()");
  await pool.query(
    `UPDATE users SET ${setSql.join(", ")}, updated_at = NOW() WHERE user_id = $${columns.length + 1}`,
    [...columns.map((column) => updates[column]), userId],
  );

  // Old files are no longer referenced; remove them (best effort).
  for (const oldPath of replacedPaths) {
    deleteFromBucket("verification-docs", oldPath).catch((err) => console.error("document cleanup failed:", err.message));
  }

  return res.status(200).json({
    message: submitted
      ? "Documents submitted. An admin will review them."
      : "Documents saved. Upload the remaining documents to submit for review.",
    submitted,
    missing_documents: missing,
    user: await loadMe(userId),
  });
};

// ---- Profile picture (public "avatars" bucket) ----

const avatarPathFromUrl = (url) => {
  const prefix = `${process.env.SUPABASE_URL}/storage/v1/object/public/avatars/`;
  return url && url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : null;
};

const cleanupOldAvatar = (url) => {
  const oldPath = avatarPathFromUrl(url);
  if (oldPath) deleteFromBucket("avatars", oldPath).catch((err) => console.error("avatar cleanup failed:", err.message));
};

// POST /users/me/avatar  (multipart/form-data, field "avatar")  — upload or change
const uploadAvatarImage = async (req, res) => {
  const userId = req.user.user_id;
  if (!req.file) throw AppError.validation("No image uploaded.", [{ field: "avatar", issue: "Attach a JPG, PNG or WebP image." }]);

  const type = detectImageType(req.file.buffer);
  if (!type) throw AppError.validation("That file isn't a valid JPG, PNG or WebP image.", [{ field: "avatar", issue: "Unrecognised image format." }]);

  const previous = (await pool.query("SELECT profile_picture_url FROM users WHERE user_id = $1", [userId])).rows[0];
  if (!previous) throw AppError.notFound("User not found");

  // A new file name each time, so browsers and the CDN never serve a stale picture.
  const storagePath = `users/${userId}/avatar-${Date.now()}.${type.ext}`;
  const { url } = await uploadToBucket("avatars", storagePath, req.file.buffer, type.mime);

  await pool.query("UPDATE users SET profile_picture_url = $1, updated_at = NOW() WHERE user_id = $2", [url, userId]);
  cleanupOldAvatar(previous.profile_picture_url);

  return res.status(200).json({ profile_picture_url: url });
};

// DELETE /users/me/avatar
const removeAvatar = async (req, res) => {
  const userId = req.user.user_id;
  const previous = (await pool.query("SELECT profile_picture_url FROM users WHERE user_id = $1", [userId])).rows[0];
  if (!previous) throw AppError.notFound("User not found");

  await pool.query("UPDATE users SET profile_picture_url = NULL, updated_at = NOW() WHERE user_id = $1", [userId]);
  cleanupOldAvatar(previous.profile_picture_url);

  return res.status(200).json({ profile_picture_url: null });
};

// GET /users/:id/profile  [auth required] — detailed profile page
//  - everyone signed in : name, picture, badges, rating, member since, listings
//  - contact (email, phone): the user, admins, and anyone linked to them by an application
//    (address is only ever shown to the user themselves and admins)
//  - background (occupation, institution, workplace): the user, admins, and landlords
//    the user has applied to
//  - verification documents are never part of this response
const getProfileDetail = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    throw AppError.validation("Invalid user id.", [{ field: "id", issue: "Must be a positive integer." }]);
  }
  const viewerId = req.user.user_id;
  const isSelf = viewerId === id;
  const isAdmin = Boolean(req.user.is_admin);

  const found = await pool.query(
    `SELECT user_id, name, email, contact_number, address, occupation, institution_name, workplace_name,
            profile_picture_url, is_verified, is_landlord, is_tenant, created_at
       FROM users WHERE user_id = $1`,
    [id],
  );
  if (found.rows.length === 0) throw AppError.notFound("User not found");
  const user = found.rows[0];

  let viewerIsTheirLandlord = false;
  let viewerIsTheirTenant = false;
  if (!isSelf) {
    const rel = await pool.query(
      `SELECT
         EXISTS (SELECT 1 FROM applications a JOIN properties p ON p.property_id = a.property_id
                  WHERE a.tenant_id = $2 AND p.owner_id = $1) AS viewer_is_their_landlord,
         EXISTS (SELECT 1 FROM applications a JOIN properties p ON p.property_id = a.property_id
                  WHERE a.tenant_id = $1 AND p.owner_id = $2) AS viewer_is_their_tenant`,
      [viewerId, id],
    );
    viewerIsTheirLandlord = rel.rows[0].viewer_is_their_landlord;
    viewerIsTheirTenant = rel.rows[0].viewer_is_their_tenant;
  }

  const stats = await pool.query(
    `SELECT COALESCE(AVG(rating), 0)::float AS average_rating, COUNT(*)::int AS total_reviews
       FROM reviews WHERE reviewed_user_id = $1`,
    [id],
  );
  const elig = isSelf
    ? { canReview: false, reason: "SELF_REVIEW" }
    : await getReviewEligibility(viewerId, id);

  let listings = [];
  if (user.is_landlord) {
    listings = (
      await pool.query(
        `SELECT p.property_id, p.address, p.rate, p.property_type, p.bedroom, p.bathroom,
                p.size_sqft, p.availability_status,
                (SELECT photo_url FROM property_photos WHERE property_id = p.property_id
                  ORDER BY photo_id LIMIT 1) AS cover_photo
           FROM properties p
          WHERE p.owner_id = $1 AND p.is_hidden = FALSE AND p.availability_status = 'available'
          ORDER BY p.created_at DESC LIMIT 6`,
        [id],
      )
    ).rows;
  }

  const seesAll = isSelf || isAdmin;
  const contact =
    seesAll || viewerIsTheirLandlord || viewerIsTheirTenant
      ? {
          email: user.email,
          contact_number: user.contact_number,
          ...(seesAll ? { address: user.address } : {}),
        }
      : null;
  const background =
    seesAll || viewerIsTheirLandlord
      ? { occupation: user.occupation, institution_name: user.institution_name, workplace_name: user.workplace_name }
      : null;

  return res.status(200).json({
    user_id: user.user_id,
    name: user.name,
    profile_picture_url: user.profile_picture_url,
    is_verified: user.is_verified,
    is_landlord: user.is_landlord,
    is_tenant: user.is_tenant,
    member_since: user.created_at,
    average_rating: Number(stats.rows[0].average_rating.toFixed(2)),
    total_reviews: stats.rows[0].total_reviews,
    review_eligibility: {
      can_review: elig.canReview,
      reason: elig.reason,
      reviewer_role: elig.reviewerRole ?? null,
      reviewed_role: elig.reviewedRole ?? null,
    },
    listings,
    is_self: isSelf,
    contact,
    background,
  });
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Profile picture is required" });
    }
    const userId = req.user.user_id;
    const ext = req.file.originalname.split(".").pop();
    const path = `users/${userId}/profile-${Date.now()}.${ext}`;
    const { url } = await uploadToBucket("avatars", path, req.file.buffer, req.file.mimetype);
    await pool.query(
      "UPDATE users SET profile_picture_url = $1, updated_at = NOW() WHERE user_id = $2",
      [url, userId],
    );
    return res.status(200).json({ profile_picture_url: url });
  } catch (err) {
    console.error("uploadAvatar error: ", err);
    return res.status(500).json({ success: false, message: "Failed to upload profile picture" });
  }
};

// GET /users/:id  — public profile
const getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await pool.query(
      `SELECT user_id, name, profile_picture_url, is_verified, is_landlord, created_at
       FROM users WHERE user_id = $1`,
      [id],
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }
    const user = userResult.rows[0];

    const reviewStats = await pool.query(
      `SELECT COALESCE(AVG(rating), 0)::float AS average_rating, COUNT(*)::int AS total_reviews
       FROM reviews WHERE reviewed_user_id = $1`,
      [id],
    );
    const { average_rating, total_reviews } = reviewStats.rows[0];

    return res.status(200).json({
      user_id: user.user_id,
      name: user.name,
      profile_picture_url: user.profile_picture_url, // avatars bucket is public — stored as-is
      is_verified: user.is_verified,
      is_landlord: user.is_landlord,
      member_since: user.created_at,
      average_rating: Number(average_rating.toFixed(2)),
      total_reviews,
    });
  } catch (err) {
    console.error("getPublicProfile error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch user profile" });
  }
};

module.exports = {
  getUsers,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
  uploadDocuments,
  uploadAvatar,
  uploadAvatarImage,
  removeAvatar,
  getProfileDetail,
  getPublicProfile,
};