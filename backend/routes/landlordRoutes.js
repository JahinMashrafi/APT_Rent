const express = require("express");
const router = express.Router();
const { requireAuth, requireLandlord } = require("../middleware/authMiddleware.js");
const { getLandlordLedger } = require("../controllers/landlordController");

router.get("/rent-ledger", requireAuth, requireLandlord, getLandlordLedger);

module.exports = router;