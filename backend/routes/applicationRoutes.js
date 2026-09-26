const express = require("express");
const router = express.Router();
const { requireAuth, requireTenant, requireLandlord } = require("../middleware/authMiddleware.js");
const {
  createApplication,
  listApplications,
  updateApplicationStatus,
} = require("../controllers/applicationController");

router.post("/", requireAuth, requireTenant, createApplication);
router.get("/", requireAuth, listApplications);
router.patch("/:id/status", requireAuth, requireLandlord, updateApplicationStatus);

module.exports = router;