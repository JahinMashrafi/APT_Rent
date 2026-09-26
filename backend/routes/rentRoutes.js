const express = require("express");
const router = express.Router();
const { requireAuth, requireTenant } = require("../middleware/authMiddleware.js");
const { getCurrentRent, scheduleCashPickup } = require("../controllers/rentController");

router.get("/current", requireAuth, requireTenant, getCurrentRent);
router.post("/cash-schedule", requireAuth, requireTenant, scheduleCashPickup);

module.exports = router;