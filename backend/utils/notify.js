const pool = require("../config/db.js");

/**
 * Inserts a notification row for a user. Await it, but a failure here
 * shouldn't take down the parent request — callers can choose to
 * swallow errors from this if that matters for their flow.
 */
const notify = async ({ userId, type, title, message, linkUrl = null }) => {
  await pool.query(
    `INSERT INTO notifications (user_id, notification_type, title, message, link_url)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, title, message, linkUrl],
  );
};

module.exports = { notify };