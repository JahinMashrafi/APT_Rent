const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware.js");
const {
  listMaintenance,
  getMaintenance,
  createMaintenance,
  updateMaintenanceStatus,
} = require("../controllers/maintenanceController.js");

router.get("/", requireAuth, listMaintenance);
router.post("/", requireAuth, createMaintenance);
router.get("/:id", requireAuth, getMaintenance);
router.patch("/:id/status", requireAuth, updateMaintenanceStatus);

module.exports = router;