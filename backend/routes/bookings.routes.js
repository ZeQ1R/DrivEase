import { Router } from "express";
import pool from "../config/database.js";
import { authenticate } from "../middleware/auth.js";
import { getStudentPhase } from "../lib/phase.js";

const router = Router();

router.get("/bookings/me", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, s.slot_date, s.slot_time, s.note
       FROM lesson_bookings b
       JOIN lesson_slots s ON s.id = b.slot_id
       WHERE b.student_id = $1
         AND b.attended = false
         AND (s.slot_date + s.slot_time) >= NOW()
       ORDER BY s.slot_date, s.slot_time`,
      [req.user.id]
    );
    res.status(200).json({ bookings: result.rows });
  } catch (e) { res.status(500).json({ message: "Failed to load bookings.", error: e.message }); }
});

router.delete("/bookings/:id", authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const booking = await client.query(
      `SELECT id, slot_id, attended FROM lesson_bookings
       WHERE id = $1 AND student_id = $2 FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    if (booking.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Booking not found." });
    }
    if (booking.rows[0].attended) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "This lesson has already been attended and can't be cancelled." });
    }

    await client.query(`DELETE FROM lesson_bookings WHERE id = $1`, [req.params.id]);
    await client.query(`UPDATE lesson_slots SET is_booked = false WHERE id = $1`, [booking.rows[0].slot_id]);
    await client.query("COMMIT");
    res.status(200).json({ message: "Booking cancelled." });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Failed to cancel booking.", error: e.message });
  } finally { client.release(); }
});

router.get("/hours/me", authenticate, async (req, res) => {
  try {
    const completed = await pool.query(
      `SELECT COALESCE(SUM(s.duration_hours), 0) AS hours
      FROM lesson_bookings b
      JOIN lesson_slots s ON s.id = b.slot_id
      WHERE b.student_id = $1 AND b.attended = true AND s.slot_type = 'practical'`,
      [req.user.id]
    );
    const required = await pool.query(
      `SELECT required_hours FROM registrations
       WHERE student_id = $1 AND status = 'approved' LIMIT 1`,
      [req.user.id]
    );
    const p = await getStudentPhase(pool, req.user.id);
    res.status(200).json({
      completed: Number(completed.rows[0].hours),
      required: required.rows[0] ? Number(required.rows[0].required_hours) : 40.5,
      theory: {
        completed: p ? p.theoryCompleted : 0,
        required: p ? p.theoryRequired : 20,
      },
      phase: p ? p.phase : "none",
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to load hours.", error: e.message });
  }
});

router.get("/admin/bookings", authenticate, async (req, res) => {
  try {
    const school = await pool.query(`SELECT id FROM driving_schools WHERE owner_user_id = $1`, [req.user.id]);
    if (school.rows.length === 0) return res.status(403).json({ message: "You don't manage a school." });
    const result = await pool.query(
      `SELECT b.id, b.attended, s.slot_date, s.slot_time, s.slot_type, s.duration_hours,
              u.first_name, u.last_name
       FROM lesson_bookings b
       JOIN lesson_slots s ON s.id = b.slot_id
       JOIN users u ON u.id = b.student_id
       WHERE s.school_id = $1 AND b.attended = false
       ORDER BY s.slot_date, s.slot_time`,
      [school.rows[0].id]
    );
    res.status(200).json({ bookings: result.rows });
  } catch (e) { res.status(500).json({ message: "Failed.", error: e.message }); }
});

router.patch("/admin/bookings/:id/attended", authenticate, async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT b.id FROM lesson_bookings b
       JOIN lesson_slots s ON s.id = b.slot_id
       JOIN driving_schools d ON d.id = s.school_id
       WHERE b.id = $1 AND d.owner_user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) return res.status(403).json({ message: "Not your school's booking." });
    await pool.query(`UPDATE lesson_bookings SET attended = true WHERE id = $1`, [req.params.id]);
    res.status(200).json({ message: "Marked attended." });
  } catch (e) { res.status(500).json({ message: "Failed.", error: e.message }); }
});

export default router;
