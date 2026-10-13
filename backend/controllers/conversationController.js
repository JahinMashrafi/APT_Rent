const pool = require("../config/db.js");
const { notify } = require("../utils/notify.js");

const MAX_MESSAGE_LENGTH = 2000;
const DEFAULT_PAGE_SIZE = 50;

/**
 * Derives the two-letter initials the inbox avatar expects, e.g.
 * "Karim Mia" -> "KM", "Nasreen" -> "N".
 */
const initialsOf = (name) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

/**
 * Verifies whether a tenant and landlord have an application, tour, or
 * contract relationship for a property when a stricter messaging policy
 * requires it.
 *
 * Note that applications/appointments/contracts carry no landlord column —
 * the landlord is always reached through properties.owner_id.
 */
const hasPropertyLink = async ({ tenantId, landlordId, propertyId }) => {
  const result = await pool.query(
    `SELECT EXISTS (
        SELECT 1 FROM applications a
        JOIN properties p ON p.property_id = a.property_id
        WHERE a.tenant_id = $1 AND p.property_id = $2 AND p.owner_id = $3
     ) OR EXISTS (
        SELECT 1 FROM appointments t
        JOIN properties p ON p.property_id = t.property_id
        WHERE t.tenant_id = $1 AND p.property_id = $2 AND p.owner_id = $3
     ) OR EXISTS (
        SELECT 1 FROM contracts c
        JOIN properties p ON p.property_id = c.property_id
        WHERE c.tenant_id = $1 AND p.property_id = $2 AND p.owner_id = $3
     ) AS linked`,
    [tenantId, propertyId, landlordId],
  );
  return result.rows[0].linked;
};

/**
 * Loads a conversation and verifies the caller is one of its two
 * participants. Returns { conversation } on success, or
 * { status, message } describing why the caller may not proceed.
 *
 * Conversations store an unordered participant pair, so membership is a
 * simple either-slot check.
 */
const loadParticipantConversation = async (conversationId, userId, isAdmin = false) => {
  const result = await pool.query(
    "SELECT * FROM conversations WHERE conversation_id = $1",
    [conversationId],
  );
  if (result.rows.length === 0) {
    return { status: 404, message: "Conversation not found" };
  }
  const conversation = result.rows[0];
  const isParticipant =
    conversation.participant_one === userId || conversation.participant_two === userId;
  if (!isParticipant && !isAdmin) {
    return { status: 403, message: "You are not part of this conversation" };
  }
  return { conversation };
};

/**
 * Finds an existing thread for a user pair on a property. Order-agnostic,
 * matching the LEAST/GREATEST pairing index, so it finds a thread no
 * matter which participant slot each party occupies.
 */
const findExistingConversation = async ({ propertyId, userA, userB }) => {
  const result = await pool.query(
    `SELECT conversation_id FROM conversations
     WHERE property_id = $1
       AND ((participant_one = $2 AND participant_two = $3)
         OR (participant_one = $3 AND participant_two = $2))
     LIMIT 1`,
    [propertyId, userA, userB],
  );
  return result.rows[0]?.conversation_id ?? null;
};

// GET /conversations  [auth required]
// Returns every thread the caller is in, newest activity first, with the
// other party's profile, the linked property, and an unread count.
const listConversations = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await pool.query(
      `SELECT c.conversation_id, c.property_id, c.last_message_at,
              cp.user_id AS participant_id, cp.name AS participant_name,
              cp.profile_picture_url AS participant_picture,
              cp.is_landlord, cp.is_tenant,
              p.address AS property_address,
              last_msg.message_text AS last_message_text,
              last_msg.created_at AS last_message_created_at,
              (SELECT COUNT(*) FROM messages m
                WHERE m.conversation_id = c.conversation_id
                  AND m.is_read = false
                  AND m.sender_id != $1) AS unread_count
       FROM conversations c
       JOIN users cp
         ON cp.user_id = (CASE WHEN c.participant_one = $1 THEN c.participant_two ELSE c.participant_one END)
       LEFT JOIN properties p ON p.property_id = c.property_id
       LEFT JOIN LATERAL (
            SELECT message_text, created_at
            FROM messages
            WHERE conversation_id = c.conversation_id
            ORDER BY created_at DESC
            LIMIT 1
       ) last_msg ON TRUE
       WHERE c.participant_one = $1 OR c.participant_two = $1
       ORDER BY COALESCE(last_msg.created_at, c.last_message_at) DESC`,
      [userId],
    );

    const data = result.rows.map((row) => ({
      id: row.conversation_id,
      propertyId: row.property_id,
      // Matches the camelCase shape the existing inbox UI destructures.
      participant: {
        id: row.participant_id,
        name: row.participant_name,
        initials: initialsOf(row.participant_name),
        role: row.is_landlord ? "Landlord" : row.is_tenant ? "Tenant" : "User",
        profile_picture_url: row.participant_picture,
        // No presence tracking exists; reporting a fabricated "online"
        // would be worse than admitting we don't know.
        isOnline: false,
      },
      propertyTitle: row.property_address,
      lastMessage: row.last_message_text || "",
      lastMessageTime: row.last_message_created_at || row.last_message_at,
      unreadCount: Number(row.unread_count),
    }));

    return res.status(200).json({ data });
  } catch (err) {
    console.error("listConversations error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch conversations" });
  }
};

// POST /conversations  [auth required] — body: { property_id, recipient_id }
// Idempotent: returns the existing thread if one already exists for this
// pairing, so a double-click or a second entry point can't fork a thread.
const startConversation = async (req, res) => {
  const userId = req.user.user_id;
  try {
    const { property_id, recipient_id } = req.body || {};

    if (!property_id || !recipient_id) {
      return res.status(422).json({ success: false, message: "property_id and recipient_id are required" });
    }
    if (Number(recipient_id) === Number(userId)) {
      return res.status(422).json({ success: false, message: "You cannot start a conversation with yourself" });
    }

    const propResult = await pool.query(
      "SELECT property_id, owner_id FROM properties WHERE property_id = $1",
      [property_id],
    );
    if (propResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    const property = propResult.rows[0];

    // The caller is either the owner messaging an applicant, or a tenant
    // messaging the owner. Resolve which, and reject anyone else.
    let landlordId;
    let tenantId;
    if (property.owner_id === userId) {
      landlordId = userId;
      tenantId = Number(recipient_id);
    } else if (Number(recipient_id) === property.owner_id) {
      landlordId = property.owner_id;
      tenantId = userId;
    } else {
      return res.status(403).json({ success: false, message: "You can only message the owner of this property" });
    }

    const recipientResult = await pool.query(
      "SELECT user_id FROM users WHERE user_id = $1",
      [Number(recipient_id)],
    );
    if (recipientResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Recipient not found" });
    }

    const existingId = await findExistingConversation({
      propertyId: property_id,
      userA: landlordId,
      userB: tenantId,
    });
    if (existingId) {
      return res.status(200).json({
        conversation_id: existingId,
        created: false,
        message: "Conversation already exists",
      });
    }

    // Store the landlord in participant_one for consistency, though the
    // lookup above and below are order-agnostic.
    const inserted = await pool.query(
      `INSERT INTO conversations (property_id, participant_one, participant_two, last_message_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING conversation_id`,
      [property_id, landlordId, tenantId],
    );

    return res.status(201).json({
      conversation_id: inserted.rows[0].conversation_id,
      created: true,
      message: "Conversation started",
    });
  } catch (err) {
    // Two concurrent starts can race between the lookup and the insert;
    // the pairing index catches it. Re-read to report the winner.
    if (err.code === "23505") {
      const { property_id, recipient_id } = req.body || {};
      const ownerId = (
        await pool.query("SELECT owner_id FROM properties WHERE property_id = $1", [property_id])
      ).rows[0]?.owner_id;
      const otherId = ownerId === userId ? Number(recipient_id) : ownerId;
      const existingId = await findExistingConversation({
        propertyId: property_id,
        userA: userId,
        userB: otherId,
      });
      return res.status(200).json({
        conversation_id: existingId,
        created: false,
        message: "Conversation already exists",
      });
    }
    console.error("startConversation error: ", err);
    return res.status(500).json({ success: false, message: "Failed to start conversation" });
  }
};

// GET /conversations/:id/messages  [auth required, participant only]
// Returns messages oldest-first to match what the thread renderer expects.
const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const limit = Math.min(Number(req.query.limit) || DEFAULT_PAGE_SIZE, 200);
    const before = req.query.before;

    const { status, message, conversation } = await loadParticipantConversation(id, userId, req.user.is_admin);
    if (!conversation) {
      return res.status(status).json({ success: false, message });
    }

    // `before` is a message_id, used to page backwards through history.
    // Subquery rather than a join so the caller can omit it entirely.
    const result = await pool.query(
      `SELECT message_id, sender_id, message_text, is_read, created_at
       FROM (
            SELECT message_id, sender_id, message_text, is_read, created_at
            FROM messages
            WHERE conversation_id = $1
              AND ($2::int IS NULL OR message_id < $2)
            ORDER BY message_id DESC
            LIMIT $3
       ) page
       ORDER BY message_id ASC`,
      [id, before || null, limit],
    );

    return res.status(200).json({
      conversation_id: conversation.conversation_id,
      data: result.rows.map((row) => ({
        id: row.message_id,
        senderId: row.sender_id,
        text: row.message_text,
        timestamp: row.created_at,
        // The table stores a boolean; the UI just needs read vs not.
        readAt: row.is_read ? row.created_at : null,
      })),
    });
  } catch (err) {
    console.error("getMessages error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch messages" });
  }
};

// POST /conversations/:id/messages  [auth required, participant only]
// body: { message_text }
const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const { message_text } = req.body || {};

    if (typeof message_text !== "string" || !message_text.trim()) {
      return res.status(422).json({ success: false, message: "message_text is required" });
    }
    const text = message_text.trim();
    if (text.length > MAX_MESSAGE_LENGTH) {
      return res.status(422).json({
        success: false,
        message: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
      });
    }

    const { status, message, conversation } = await loadParticipantConversation(id, userId, req.user.is_admin);
    if (!conversation) {
      return res.status(status).json({ success: false, message });
    }

    const inserted = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, message_text)
       VALUES ($1, $2, $3)
       RETURNING message_id, sender_id, message_text, is_read, created_at`,
      [id, userId, text],
    );

    await pool.query(
      "UPDATE conversations SET last_message_at = NOW() WHERE conversation_id = $1",
      [id],
    );

    const recipientId =
      conversation.participant_one === userId ? conversation.participant_two : conversation.participant_one;

    // Best-effort — a failed notification shouldn't fail the send, since
    // the message itself is already durably stored.
    notify({
      userId: recipientId,
      type: "message",
      title: "New message",
      message: text.length > 80 ? `${text.slice(0, 77)}...` : text,
      linkUrl: `/inbox?conversation=${id}`,
    }).catch((err) => console.error("notify error: ", err.message));

    const row = inserted.rows[0];
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
    console.error("sendMessage error: ", err);
    return res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

// PATCH /conversations/:id/read  [auth required, participant only]
const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const { status, message, conversation } = await loadParticipantConversation(id, userId, req.user.is_admin);
    if (!conversation) {
      return res.status(status).json({ success: false, message });
    }

    // Only the recipient's copy flips — never the caller's own messages.
    await pool.query(
      `UPDATE messages SET is_read = true
       WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
      [id, userId],
    );

    return res.status(200).json({ conversation_id: conversation.conversation_id, unread_count: 0 });
  } catch (err) {
    console.error("markRead error: ", err);
    return res.status(500).json({ success: false, message: "Failed to mark conversation as read" });
  }
};

module.exports = {
  listConversations,
  startConversation,
  getMessages,
  sendMessage,
  markRead,
};