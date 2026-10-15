const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware.js");
const { rescheduleAppointment, getAppointment } = require("../controllers/appointmentRescheduleController.js");

router.patch("/:id/reschedule", requireAuth, rescheduleAppointment);
router.get("/:id", requireAuth, getAppointment);

module.exports = router;