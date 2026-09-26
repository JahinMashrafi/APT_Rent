const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware.js");
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController.js");

router.get("/", requireAuth, getNotifications);
router.patch("/read-all", requireAuth, markAllNotificationsRead); // must come before /:id/read — otherwise "read-all" matches :id
router.patch("/:id/read", requireAuth, markNotificationRead);

module.exports = router;