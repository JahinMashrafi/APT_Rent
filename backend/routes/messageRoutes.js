const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware.js");
const {
  getConversations,
  createConversation,
  getConversationMessages,
  postMessage,
  markConversationRead,
} = require("../controllers/messageController.js");

router.get("/", requireAuth, getConversations);
router.post("/", requireAuth, createConversation);
router.get("/:id/messages", requireAuth, getConversationMessages);
router.post("/:id/messages", requireAuth, postMessage);
router.patch("/:id/read", requireAuth, markConversationRead);

module.exports = router;