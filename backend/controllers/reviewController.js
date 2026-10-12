const pool = require("../config/db.js");
const { notify } = require("../utils/notify.js");

// GET /users/:id/reviews  [public]
const getUserReviews = async (req, res) => {
  try {
    const { id } = req.params;

    const userCheck = await pool.query("SELECT user_id FROM users WHERE user_id = $1", [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${id} not found` });
    }

    const statsResult = await pool.query(
      `SELECT COALESCE(AVG(rating), 0)::float AS average_rating, COUNT(*)::int AS total_reviews
       FROM reviews WHERE reviewed_user_id = $1`,
      [id],
    );
    const { average_rating, total_reviews } = statsResult.rows[0];

    const reviewsResult = await pool.query(
      `SELECT r.review_id, r.reviewer_id, u.name AS reviewer_name, r.rating, r.comment, r.created_at
       FROM reviews r
       JOIN users u ON u.user_id = r.reviewer_id
       WHERE r.reviewed_user_id = $1
       ORDER BY r.created_at DESC`,
      [id],
    );

    return res.status(200).json({
      average_rating: Number(average_rating.toFixed(2)),
      total_reviews,
      data: reviewsResult.rows,
    });
  } catch (err) {
    console.error("getUserReviews error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
};

// POST /users/:id/reviews  [auth required]
const createReview = async (req, res) => {
  try {
    const reviewerId = req.user.user_id;
    const reviewedUserId = Number(req.params.id);
    const { rating, comment } = req.body || {};

    if (reviewerId === reviewedUserId) {
      return res.status(422).json({ success: false, message: "You cannot review yourself" });
    }
    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(422).json({ success: false, message: "rating is required and must be an integer between 1 and 5" });
    }

    const userCheck = await pool.query("SELECT user_id FROM users WHERE user_id = $1", [reviewedUserId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${reviewedUserId} not found` });
    }

    // Prerequisite: the two users must share contract history (as owner/tenant,
    // in either direction) — a review isn't tied to one specific contract
    // since `reviews` has no contract_id column, so this just checks the
    // relationship exists at all, not a specific completed lease.
    const sharedContract = await pool.query(
      `SELECT contract_id FROM contracts
       WHERE status != 'draft'
         AND ((owner_id = $1 AND tenant_id = $2) OR (owner_id = $2 AND tenant_id = $1))
       LIMIT 1`,
      [reviewerId, reviewedUserId],
    );
    if (sharedContract.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You can only review someone you have shared a signed lease with",
      });
    }

    // One review per reviewer→reviewed_user pair (no contract_id on this table
    // to scope it more tightly than that).
    const existing = await pool.query(
      `SELECT review_id FROM reviews WHERE reviewer_id = $1 AND reviewed_user_id = $2`,
      [reviewerId, reviewedUserId],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: "You have already reviewed this user" });
    }

    const result = await pool.query(
      `INSERT INTO reviews (reviewer_id, reviewed_user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING review_id, reviewer_id, reviewed_user_id, rating, created_at`,
      [reviewerId, reviewedUserId, rating, comment || null],
    );

    await notify({
      userId: reviewedUserId,
      type: "review_received",
      title: "New review",
      message: `You received a ${rating}-star review.`,
      linkUrl: `/users/${reviewedUserId}/reviews`,
    });

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createReview error: ", err);
    if (err.code === "23505") {
      return res.status(409).json({ success: false, message: "You have already reviewed this user" });
    }
    return res.status(500).json({ success: false, message: "Failed to submit review" });
  }
};

module.exports = { getUserReviews, createReview };