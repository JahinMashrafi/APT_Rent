const pool = require("../config/db.js");
const { notify } = require("../utils/notify.js");
const { emitToUser, isUserOnline } = require("../utils/socket.js");

const initialsOf = (name) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

// Loads a conversation and verifies the requester is one of its two participants.
// Returns { conversation, otherParticipantId } or { conversation, forbidden: true }
// if found but the requester isn't a party, or null if not found at all.
const loadConversationForUser = async (conversationId, userId) => {
  const result = await pool.query(
    "SELECT * FROM conversations WHERE conversation_id = $1",
    [conversationId],
  );
  if (result.rows.length === 0) return null;
  const conversation = result.rows[0];
  if (conversation.participant_one !== userId && conversation.participant_two !== userId) {
    return { conversation, forbidden: true };
  }
  const otherParticipantId = conversation.participant_one === userId
    ? conversation.participant_two
    : conversation.participant_one;
  return { conversation, otherParticipantId };
};

// GET /conversations  [auth required]
const getConversations = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await pool.query(
      `SELECT c.conversation_id, c.property_id, c.last_message_at,
              p.address AS property_title,
              CASE WHEN c.participant_one = $1 THEN c.participant_two ELSE c.participant_one END AS other_user_id
       FROM conversations c
       LEFT JOIN properties p ON p.property_id = c.property_id
       WHERE c.participant_one = $1 OR c.participant_two = $1
       ORDER BY c.last_message_at DESC NULLS LAST`,
      [userId],
    );

    const data = await Promise.all(result.rows.map(async (row) => {
      const [userResult, lastMsgResult, unreadResult] = await Promise.all([
        pool.query(
          "SELECT user_id, name, profile_picture_url FROM users WHERE user_id = $1",
          [row.other_user_id],
        ),
        pool.query(
          `SELECT message_text FROM messages
           WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [row.conversation_id],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM messages
           WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE`,
          [row.conversation_id, userId],
        ),
      ]);
      const participant = userResult.rows[0];

      return {
        id: row.conversation_id,
        propertyId: row.property_id,
        propertyTitle: row.property_title,
        participant: {
          id: participant.user_id,
          name: participant.name,
          initials: initialsOf(participant.name),
          profile_picture_url: participant.profile_picture_url,
          isOnline: isUserOnline(participant.user_id),
        },
        lastMessage: lastMsgResult.rows[0]?.message_text || "",
        unreadCount: unreadResult.rows[0].count,
        lastMessageTime: row.last_message_at,
      };
    }));

    return res.status(200).json({ data });
  } catch (err) {
    console.error("getConversations error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch conversations" });
  }
};

// POST /conversations  [auth required] — starts a new thread, or resolves to the existing one
const createConversation = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { recipient_id, property_id } = req.body || {};

    if (!recipient_id || !property_id) {
      return res.status(422).json({ success: false, message: "recipient_id and property_id are required" });
    }
    if (Number(recipient_id) === Number(userId)) {
      return res.status(422).json({ success: false, message: "Cannot start a conversation with yourself" });
    }

    const recipientCheck = await pool.query("SELECT user_id FROM users WHERE user_id = $1", [recipient_id]);
    if (recipientCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Recipient not found" });
    }

    const existing = await pool.query(
      `SELECT * FROM conversations
       WHERE property_id IS NOT DISTINCT FROM $1
         AND ((participant_one = $2 AND participant_two = $3) OR (participant_one = $3 AND participant_two = $2))`,
      [property_id || null, userId, recipient_id],
    );

    let conversation;
    if (existing.rows.length > 0) {
      conversation = existing.rows[0];
    } else {
      const inserted = await pool.query(
        `INSERT INTO conversations (property_id, participant_one, participant_two, last_message_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [property_id || null, userId, recipient_id],
      );
      conversation = inserted.rows[0];
    }

    return res.status(existing.rows.length > 0 ? 200 : 201).json({
      conversation_id: conversation.conversation_id,
      created: existing.rows.length === 0,
    });
  } catch (err) {
    console.error("createConversation error: ", err);
    return res.status(500).json({ success: false, message: "Failed to start conversation" });
  }
};

// GET /conversations/:id/messages  [auth required, paginated]
const getConversationMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
    const offset = (page - 1) * limit;

    const access = await loadConversationForUser(id, userId);
    if (!access) return res.status(404).json({ success: false, message: "Conversation not found" });
    if (access.forbidden) return res.status(403).json({ success: false, message: "You are not part of this conversation" });

    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS total FROM messages WHERE conversation_id = $1",
      [id],
    );

    const messagesResult = await pool.query(
      `SELECT message_id, conversation_id, sender_id, message_text, is_read, created_at
       FROM messages WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset],
    );

    return res.status(200).json({
      data: messagesResult.rows.reverse().map((row) => ({
        id: row.message_id,
        senderId: row.sender_id,
        text: row.message_text,
        timestamp: row.created_at,
        readAt: row.is_read ? row.created_at : null,
      })),
      meta: { total_messages: countResult.rows[0].total, page },
    });
  } catch (err) {
    console.error("getConversationMessages error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch messages" });
  }
};

// POST /conversations/:id/messages  [auth required]
const postMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const { message_text } = req.body || {};

    if (!message_text || !message_text.trim()) {
      return res.status(422).json({ success: false, message: "message_text is required" });
    }

    const access = await loadConversationForUser(id, userId);
    if (!access) return res.status(404).json({ success: false, message: "Conversation not found" });
    if (access.forbidden) return res.status(403).json({ success: false, message: "You are not part of this conversation" });

    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, message_text)
       VALUES ($1, $2, $3)
       RETURNING message_id, conversation_id, sender_id, message_text, is_read, created_at`,
      [id, userId, message_text],
    );
    await pool.query(
      "UPDATE conversations SET last_message_at = NOW() WHERE conversation_id = $1",
      [id],
    );

    emitToUser(access.otherParticipantId, "message:new", result.rows[0]);

    // Writes the in-app notification row (shows up in /api/notifications) in
    // addition to the live socket push above — the two are independent, so a
    // recipient who's offline still gets it the next time they check.
    await notify({
      userId: access.otherParticipantId,
      type: "new_message",
      title: "New message",
      message: message_text.length > 80 ? `${message_text.slice(0, 77)}...` : message_text,
      linkUrl: `/conversations/${id}`,
    });

    const row = result.rows[0];
    return res.status(201).json({
      message: {
        id: row.message_id,
        senderId: row.sender_id,
        text: row.message_text,
        timestamp: row.created_at,
        readAt: row.is_read ? row.created_at : null,
      },
    });
  } catch (err) {
    console.error("postMessage error: ", err);
    return res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

// PATCH /conversations/:id/read  [auth required]
const markConversationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const access = await loadConversationForUser(id, userId);
    if (!access) return res.status(404).json({ success: false, message: "Conversation not found" });
    if (access.forbidden) return res.status(403).json({ success: false, message: "You are not part of this conversation" });

    await pool.query(
      "UPDATE messages SET is_read = TRUE WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE",
      [id, userId],
    );

    emitToUser(access.otherParticipantId, "conversation:read", { conversation_id: Number(id), reader_id: userId });

    return res.status(200).json({ status: "success", unread_count: 0 });
  } catch (err) {
    console.error("markConversationRead error: ", err);
    return res.status(500).json({ success: false, message: "Failed to mark conversation as read" });
  }
};

module.exports = {
  getConversations,
  createConversation,
  getConversationMessages,
  postMessage,
  markConversationRead,
};