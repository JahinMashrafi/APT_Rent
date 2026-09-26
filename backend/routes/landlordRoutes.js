const express = require("express");
const router = express.Router();
const { requireAuth, requireLandlord } = require("../middleware/authMiddleware.js");
const {
  getLandlordLedger,
  getLandlordStats,
  getLandlordProperties,
} = require("../controllers/landlordController");

router.get("/rent-ledger", requireAuth, requireLandlord, getLandlordLedger);
router.get("/stats", requireAuth, requireLandlord, getLandlordStats);
router.get("/properties", requireAuth, requireLandlord, getLandlordProperties);

module.exports = router;