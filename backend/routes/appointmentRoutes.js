const express = require("express");
const router = express.Router();
const { requireAuth, requireLandlord, requireTenant } = require("../middleware/authMiddleware.js");
const {
  createAppointmentBatch,
  confirmAppointment,
  listAppointments,
  cancelAppointment,
} = require("../controllers/appointmentController");

router.post("/", requireAuth, requireLandlord, createAppointmentBatch);
router.get("/", requireAuth, listAppointments);
router.patch("/:id/confirm", requireAuth, requireTenant, confirmAppointment);
router.patch("/:id/cancel", requireAuth, cancelAppointment);

module.exports = router;