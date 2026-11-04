const express = require("express");
const router = express.Router();
const { requireAuth, requireLandlord } = require("../middleware/authMiddleware.js");
const { defaultTerms, previewSummary, getSummary, updateSummary } = require("../controllers/leaseSummaryController.js");

// Fixed paths first so they are not read as a :id.
router.get("/default-terms", requireAuth, requireLandlord, defaultTerms);
router.get("/preview", requireAuth, requireLandlord, previewSummary);
router.get("/:id", requireAuth, getSummary);
router.patch("/:id", requireAuth, requireLandlord, updateSummary);

module.exports = router;