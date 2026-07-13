import { Router } from "express";
import bcrypt from "bcrypt";
import pool from "../config/database.js";
import { authenticate, requireInstructor } from "../middleware/auth.js";

const router = Router();

router.post("/admin/instructors", authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { firstName, lastName, email, phone } = req.body;

    const school = await client.query(
      `SELECT id FROM driving_schools WHERE owner_user_id = $1`, [req.user.id]
    );
    if (school.rows.length === 0) return res.status(403).json({ message: "You don't manage a school." });

    const exists = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (exists.rows.length > 0) return res.status(409).json({ message: "Email already exists." });

    await client.query("BEGIN");
    const defaultPassword = "instructor123";
    const hash = await bcrypt.hash(defaultPassword, 10);
    const result = await client.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, school_id)
       VALUES ($1,$2,$3,$4,$5,'instructor',true,$6) RETURNING id, first_name, last_name, email`,
      [firstName, lastName, email, phone || null, hash, school.rows[0].id]
    );
    await client.query("COMMIT");

    res.status(201).json({
      instructor: result.rows[0],
      login: { email, password: defaultPassword },
    });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Failed to create instructor.", error: e.message });
  } finally { client.release(); }
});

router.get("/admin/instructors", authenticate, async (req, res) => {
  try {
    const school = await pool.query(`SELECT id FROM driving_schools WHERE owner_user_id = $1`, [req.user.id]);
    if (school.rows.length === 0) return res.status(403).json({ message: "You don't manage a school." });

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone FROM users
       WHERE role = 'instructor' AND school_id = $1 ORDER BY first_name`,
      [school.rows[0].id]
    );
    res.status(200).json({ instructors: result.rows });
  } catch (e) { res.status(500).json({ message: "Failed.", error: e.message }); }
});

router.post("/instructor/slots", authenticate, requireInstructor, async (req, res) => {
  try {
    const { slotDate, slotTime, note, slotType } = req.body;
    if (!slotDate || !slotTime) return res.status(400).json({ message: "Date and time required." });

    const result = await pool.query(
      `INSERT INTO lesson_slots (school_id, instructor_id, slot_date, slot_time, note, slot_type)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.school_id, req.user.id, slotDate, slotTime, note || null, slotType || 'practical']
    );
    res.status(201).json({ slot: result.rows[0] });
  } catch (e) { res.status(500).json({ message: "Failed to create slot.", error: e.message }); }
});

router.get("/instructor/bookings", authenticate, requireInstructor, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.attended, s.slot_date, s.slot_time, s.slot_type, s.duration_hours,
              u.first_name, u.last_name
       FROM lesson_bookings b
       JOIN lesson_slots s ON s.id = b.slot_id
       JOIN users u ON u.id = b.student_id
       WHERE s.instructor_id = $1 AND b.attended = false
       ORDER BY s.slot_date, s.slot_time`,
      [req.user.id]
    );
    res.status(200).json({ bookings: result.rows });
  } catch (e) { res.status(500).json({ message: "Failed.", error: e.message }); }
});

router.patch("/instructor/bookings/:id/attended", authenticate, requireInstructor, async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT b.id FROM lesson_bookings b
       JOIN lesson_slots s ON s.id = b.slot_id
       WHERE b.id = $1 AND s.instructor_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) return res.status(403).json({ message: "Not your lesson." });

    await pool.query(`UPDATE lesson_bookings SET attended = true WHERE id = $1`, [req.params.id]);
    res.status(200).json({ message: "Marked attended." });
  } catch (e) { res.status(500).json({ message: "Failed.", error: e.message }); }
});

router.get("/instructor/students", authenticate, requireInstructor, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              COALESCE(SUM(CASE WHEN b.attended AND s.slot_type='practical' THEN s.duration_hours ELSE 0 END), 0) AS completed_hours
       FROM lesson_bookings b
       JOIN lesson_slots s ON s.id = b.slot_id
       JOIN users u ON u.id = b.student_id
       WHERE s.instructor_id = $1
       GROUP BY u.id, u.first_name, u.last_name, u.email
       ORDER BY u.first_name`,
      [req.user.id]
    );
    res.status(200).json({ students: result.rows });
  } catch (e) { res.status(500).json({ message: "Failed.", error: e.message }); }
});

export default router;
