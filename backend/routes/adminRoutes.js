const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware.js");
const {
  getAdminStats,
  getVerificationQueue,
  approveVerification,
  rejectVerification,
  getUsers,
  createUserByAdmin,
  toggleAdminRole,
  toggleBanUser,
  getDisputes,
  resolveDispute,
} = require("../controllers/adminController");
const { createDispute } = require("../controllers/disputeController");

// System Metrics & Verification Queue (Section 12, Page 18-19)
router.get("/stats", requireAuth, requireAdmin, getAdminStats);
router.get("/verifications", requireAuth, requireAdmin, getVerificationQueue);
router.patch("/verifications/:id/approve", requireAuth, requireAdmin, approveVerification);
router.patch("/verifications/:id/reject", requireAuth, requireAdmin, rejectVerification);

// User Management & Provisioning (Admin Control Ledger)
router.get("/users", requireAuth, requireAdmin, getUsers);
router.post("/users", requireAuth, requireAdmin, createUserByAdmin);
router.patch("/users/:id/admin", requireAuth, requireAdmin, toggleAdminRole);
router.patch("/users/:id/ban", requireAuth, requireAdmin, toggleBanUser);

// Dispute Mediation & Arbitration (Page 2 & 19)
router.get("/disputes", requireAuth, requireAdmin, getDisputes);
router.post("/disputes", requireAuth, createDispute);
router.patch("/disputes/:id/resolve", requireAuth, requireAdmin, resolveDispute);

module.exports = router;