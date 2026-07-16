import { Router } from "express";
import jwt from "jsonwebtoken";
import pool from "../config/database.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

function optionalUser(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try { return jwt.verify(header.split(" ")[1], process.env.JWT_SECRET); } catch { return null; }
  }
  return null;
}

// PUBLIC: reviews for a school + average/count, plus the caller's own review and eligibility when logged in
router.get("/schools/:id/reviews", async (req, res) => {
  try {
    const reviews = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON u.id = r.student_id
       WHERE r.school_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    const stats = await pool.query(
      `SELECT COALESCE(ROUND(AVG(rating), 1), 0) AS average, COUNT(*) AS count
       FROM reviews WHERE school_id = $1`,
      [req.params.id]
    );

    const user = optionalUser(req);
    let myReview = null;
    let canReview = false;
    if (user) {
      const mine = await pool.query(
        `SELECT id, rating, comment FROM reviews WHERE school_id = $1 AND student_id = $2`,
        [req.params.id, user.id]
      );
      myReview = mine.rows[0] || null;
      const enrolled = await pool.query(
        `SELECT id FROM registrations WHERE student_id = $1 AND school_id = $2 AND status = 'approved' LIMIT 1`,
        [user.id, req.params.id]
      );
      canReview = enrolled.rows.length > 0;
    }

    res.status(200).json({
      reviews: reviews.rows,
      average: Number(stats.rows[0].average),
      count: Number(stats.rows[0].count),
      myReview,
      canReview,
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to load reviews.", error: e.message });
  }
});

// STUDENT: create or update their review for a school they're enrolled at; recomputes the school's rating
router.post("/schools/:id/reviews", authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const rating = Number(req.body.rating);
    const { comment } = req.body;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const enrolled = await client.query(
      `SELECT id FROM registrations WHERE student_id = $1 AND school_id = $2 AND status = 'approved' LIMIT 1`,
      [req.user.id, req.params.id]
    );
    if (enrolled.rows.length === 0) {
      return res.status(403).json({ message: "Only enrolled students can review this school." });
    }

    await client.query("BEGIN");
    const upsert = await client.query(
      `INSERT INTO reviews (school_id, student_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (school_id, student_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = now()
       RETURNING id, rating, comment, created_at`,
      [req.params.id, req.user.id, rating, comment || null]
    );
    // the school's displayed rating is now the real average of its reviews
    await client.query(
      `UPDATE driving_schools
       SET rating = (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE school_id = $1)
       WHERE id = $1`,
      [req.params.id]
    );
    await client.query("COMMIT");

    res.status(201).json({ review: upsert.rows[0] });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Failed to submit review.", error: e.message });
  } finally {
    client.release();
  }
});

export default router;
