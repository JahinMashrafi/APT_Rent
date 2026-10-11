const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware.js");
const {
  listConversations,
  startConversation,
  getMessages,
  sendMessage,
  markRead,
} = require("../controllers/conversationController");

// Both parties can do all of these — participation is checked per
// conversation inside the controller, not by role here.
router.get("/", requireAuth, listConversations);
router.post("/", requireAuth, startConversation);
router.get("/:id/messages", requireAuth, getMessages);
router.post("/:id/messages", requireAuth, sendMessage);
router.patch("/:id/read", requireAuth, markRead);

module.exports = router;