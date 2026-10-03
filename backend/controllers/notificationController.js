const pool = require("../config/db.js");

const DEFAULT_LIMIT = 30;

/**
 * `notify()` in utils/notify.js has always written rows here, but
 * nothing read them back, so the navbar bell stayed permanently
 * empty. This is the read side of that table.
 *
 * The table stores snake_case (created_at, is_read); AppNavbar.jsx
 * destructures camelCase (timestamp, isRead) and navigates via `link`.
 * The mapping lives here so neither side has to know about the other.
 */
const toNotificationDto = (row) => ({
  id: row.notification_id,
  type: row.notification_type,
  title: row.title,
  message: row.message,
  // The navbar calls navigate(n.link), so the column is renamed here
  // rather than leaving every call site to remember link_url.
  link: row.link_url,
  isRead: row.is_read,
  timestamp: row.created_at,
});

// GET /notifications  [auth required]
// The caller's own rows only, newest first.
const listNotifications = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, 100);

    const result = await pool.query(
      `SELECT notification_id, notification_type, title, message, link_url, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit],
    );

    return res.status(200).json({ data: result.rows.map(toNotificationDto) });
  } catch (err) {
    console.error("listNotifications error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

// PATCH /notifications/:id/read  [auth required]
// The user_id predicate is the authorization check: someone else's
// notification id simply matches zero rows.
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const result = await pool.query(
      "UPDATE notifications SET is_read = true WHERE notification_id = $1 AND user_id = $2 RETURNING notification_id",
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    return res.status(200).json({ notification_id: Number(id), is_read: true });
  } catch (err) {
    console.error("markNotificationRead error: ", err);
    return res.status(500).json({ success: false, message: "Failed to mark notification as read" });
  }
};

// PATCH /notifications/read-all  [auth required]
const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await pool.query(
      "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
      [userId],
    );

    return res.status(200).json({ updated: result.rowCount });
  } catch (err) {
    console.error("markAllNotificationsRead error: ", err);
    return res.status(500).json({ success: false, message: "Failed to mark notifications as read" });
  }
};

module.exports = { listNotifications, markNotificationRead, markAllNotificationsRead };
