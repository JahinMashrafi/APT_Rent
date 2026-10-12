const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware.js");
const {
  getAdminStats,
  getVerificationQueue,
  approveVerification,
  rejectVerification,
} = require("../controllers/adminController");
const { createDispute, resolveDispute } = require("../controllers/disputeController");

router.get("/stats", requireAuth, requireAdmin, getAdminStats);

router.get("/verifications", requireAuth, requireAdmin, getVerificationQueue);
router.patch("/verifications/:id/approve", requireAuth, requireAdmin, approveVerification);
router.patch("/verifications/:id/reject", requireAuth, requireAdmin, rejectVerification);

// Spec marks POST /admin/disputes as [Auth Required], not admin-only —
// either party can file a dispute; only resolving it is admin-only.
router.post("/disputes", requireAuth, createDispute);
router.patch("/disputes/:id/resolve", requireAuth, requireAdmin, resolveDispute);

module.exports = router;