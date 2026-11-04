const pool = require("../config/db.js");
const { notify } = require("../utils/notify.js");
const { getReviewEligibility, REASONS } = require("../utils/reviewEligibility.js");

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
    const reviewerId = req.user.user_id; // from the JWT, never from the request body
    const reviewedUserId = Number(req.params.id);
    const { rating, comment } = req.body || {};

    if (!Number.isInteger(reviewedUserId) || reviewedUserId < 1) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(422).json({ success: false, message: "rating is required and must be an integer between 1 and 5" });
    }

    const cleanComment = typeof comment === "string" ? comment.trim() : "";
    if (cleanComment.length > 1000) {
      return res.status(422).json({ success: false, message: "comment must be 1000 characters or fewer" });
    }

    const userCheck = await pool.query("SELECT user_id FROM users WHERE user_id = $1", [reviewedUserId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: `User with id ${reviewedUserId} not found` });
    }

    // Same check the profile page used to decide whether to show the form.
    const elig = await getReviewEligibility(reviewerId, reviewedUserId);
    if (!elig.canReview) {
      switch (elig.reason) {
        case REASONS.SELF:
          return res.status(422).json({ success: false, message: "You cannot review yourself" });
        case REASONS.DUPLICATE:
          return res.status(409).json({ success: false, message: "You have already reviewed this user" });
        default:
          return res.status(403).json({
            success: false,
            message: "You can only review a landlord or tenant you have an active lease with",
          });
      }
    }

    const result = await pool.query(
      `INSERT INTO reviews (reviewer_id, reviewed_user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING review_id, reviewer_id, reviewed_user_id, rating, comment, created_at`,
      [reviewerId, reviewedUserId, rating, cleanComment || null],
    );

    await notify({
      userId: reviewedUserId,
      type: "review_received",
      title: "New review",
      message: `You received a ${rating}-star review.`,
      linkUrl: `/users/${reviewedUserId}`,
    });

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("createReview error: ", err);
    // Two simultaneous submits: the unique index rejects the second.
    if (err.code === "23505") {
      return res.status(409).json({ success: false, message: "You have already reviewed this user" });
    }
    return res.status(500).json({ success: false, message: "Failed to submit review" });
  }
};

module.exports = { getUserReviews, createReview };
