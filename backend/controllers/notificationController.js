const pool = require("../config/db.js");

// GET /notifications  [auth required]
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);

    const [dataResult, unreadResult] = await Promise.all([
      pool.query(
        `SELECT notification_id, notification_type, title, message, link_url, is_read, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
        [userId],
      ),
    ]);

    return res.status(200).json({
      unread_count: unreadResult.rows[0].count,
      data: dataResult.rows,
    });
  } catch (err) {
    console.error("getNotifications error: ", err);
    return res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

// PATCH /notifications/:id/read  [auth required]
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE notification_id = $1 AND user_id = $2
       RETURNING notification_id, is_read`,
      [id, userId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("markNotificationRead error: ", err);
    return res.status(500).json({ success: false, message: "Failed to mark notification as read" });
  }
};

// PATCH /notifications/read-all  [auth required]
const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.user_id;
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      [userId],
    );
    return res.status(200).json({ message: "All notifications marked as read." });
  } catch (err) {
    console.error("markAllNotificationsRead error: ", err);
    return res.status(500).json({ success: false, message: "Failed to mark notifications as read" });
  }
};

module.exports = { getNotifications, markNotificationRead, markAllNotificationsRead };