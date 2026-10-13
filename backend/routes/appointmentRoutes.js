const express = require("express");
const router = express.Router();
const { requireAuth, requireLandlord, requireTenant } = require("../middleware/authMiddleware.js");
const {
  requestTour,
  createAppointmentBatch,
  confirmAppointment,
  rejectProposalSlots,
  listAppointments,
  cancelAppointment,
} = require("../controllers/appointmentController");

// Any signed-in user may ask to view a property — the controller
// blocks asking about your own flat — so this is requireAuth rather
// than requireTenant.
router.post("/request", requireAuth, requestTour);
router.post("/", requireAuth, requireLandlord, createAppointmentBatch);
router.get("/", requireAuth, listAppointments);
router.patch("/:id/confirm", requireAuth, requireTenant, confirmAppointment);
router.patch("/:id/reject", requireAuth, requireTenant, rejectProposalSlots);
router.patch("/:id/cancel", requireAuth, cancelAppointment);

module.exports = router;
