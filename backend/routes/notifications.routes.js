import { Router } from "express";
import pool from "../config/database.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/notifications/me", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, message, type, link, is_read, created_at
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 30`,
      [req.user.id]
    );
    const unread = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );
    res.status(200).json({ notifications: result.rows, unread: Number(unread.rows[0].count) });
  } catch (e) {
    res.status(500).json({ message: "Failed to load notifications.", error: e.message });
  }
});

router.patch("/notifications/:id/read", authenticate, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.status(200).json({ message: "ok" });
  } catch (e) {
    res.status(500).json({ message: "Failed to update notification.", error: e.message });
  }
});

router.patch("/notifications/read-all", authenticate, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );
    res.status(200).json({ message: "ok" });
  } catch (e) {
    res.status(500).json({ message: "Failed to update notifications.", error: e.message });
  }
});

export default router;
