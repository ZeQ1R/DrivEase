import pool from "../config/database.js";

// Best-effort in-app notification. Uses its own pool connection so it is never
// tied to (or able to break) the caller's transaction. Never throws.
export async function notify(userId, message, type = "info", link = null) {
  if (!userId) return;
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, message, type, link) VALUES ($1, $2, $3, $4)`,
      [userId, message, type, link]
    );
  } catch (e) {
    console.error("notify failed:", e.message);
  }
}
