const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware.js");
const { getUserReviews, createReview } = require("../controllers/reviewController.js");

router.get("/:id/reviews", getUserReviews);
router.post("/:id/reviews", requireAuth, createReview);

module.exports = router;