const express = require("express");
const router = express.Router();
const { requireAuth, requireLandlord } = require("../middleware/authMiddleware.js");
const {
  getLandlordStats,
  getLandlordProperties,
} = require("../controllers/landlordController");

router.get("/properties", requireAuth, requireLandlord, getLandlordProperties);
router.get("/stats", requireAuth, requireLandlord, getLandlordStats);

module.exports = router;