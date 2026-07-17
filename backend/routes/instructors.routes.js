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

router.put("/admin/instructors/:id", authenticate, async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: "First name, last name and email are required." });
    }

    const owns = await pool.query(
      `SELECT u.id FROM users u
       JOIN driving_schools s ON s.id = u.school_id
       WHERE u.id = $1 AND u.role = 'instructor' AND s.owner_user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (owns.rows.length === 0) return res.status(403).json({ message: "Not your school's instructor." });

    const emailTaken = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND id <> $2`, [email, req.params.id]
    );
    if (emailTaken.rows.length > 0) return res.status(409).json({ message: "Email already in use." });

    const result = await pool.query(
      `UPDATE users SET first_name = $1, last_name = $2, email = $3, phone = $4
       WHERE id = $5 RETURNING id, first_name, last_name, email, phone`,
      [firstName, lastName, email, phone || null, req.params.id]
    );
    res.status(200).json({ instructor: result.rows[0] });
  } catch (e) { res.status(500).json({ message: "Failed to update instructor.", error: e.message }); }
});

router.delete("/admin/instructors/:id", authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const owns = await client.query(
      `SELECT u.id FROM users u
       JOIN driving_schools s ON s.id = u.school_id
       WHERE u.id = $1 AND u.role = 'instructor' AND s.owner_user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (owns.rows.length === 0) return res.status(403).json({ message: "Not your school's instructor." });

    const assigned = await client.query(
      `SELECT id FROM registrations WHERE instructor_id = $1 AND status = 'approved' LIMIT 1`,
      [req.params.id]
    );
    if (assigned.rows.length > 0) {
      return res.status(409).json({ message: "This instructor still has assigned students. Reassign them first." });
    }

    const booked = await client.query(
      `SELECT b.id FROM lesson_bookings b
       JOIN lesson_slots s ON s.id = b.slot_id
       WHERE s.instructor_id = $1 LIMIT 1`,
      [req.params.id]
    );
    if (booked.rows.length > 0) {
      return res.status(409).json({ message: "This instructor has booked lessons and can't be deleted." });
    }

    await client.query("BEGIN");
    await client.query(`DELETE FROM lesson_slots WHERE instructor_id = $1`, [req.params.id]);
    await client.query(`UPDATE registrations SET instructor_id = NULL WHERE instructor_id = $1`, [req.params.id]);
    await client.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
    await client.query("COMMIT");

    res.status(200).json({ message: "Instructor deleted." });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Failed to delete instructor.", error: e.message });
  } finally { client.release(); }
});

router.post("/instructor/slots", authenticate, requireInstructor, async (req, res) => {
  try {
    const { slotDate, slotTime, note, durationHours } = req.body;
    if (!slotDate || !slotTime) return res.status(400).json({ message: "Date and time required." });
    if (slotDate < new Date().toISOString().split("T")[0]) {
      return res.status(400).json({ message: "You can't create a lesson in the past." });
    }

    const result = await pool.query(
      `INSERT INTO lesson_slots (school_id, instructor_id, slot_date, slot_time, note, slot_type, duration_hours)
       VALUES ($1,$2,$3,$4,$5,'practical',$6) RETURNING *`,
      [req.user.school_id, req.user.id, slotDate, slotTime, note || null, durationHours || 1.5]
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
              COALESCE(SUM(CASE WHEN b.attended AND s.slot_type='practical' THEN s.duration_hours ELSE 0 END), 0) AS completed_hours,
              COALESCE(MAX(r.required_hours), 40) AS required_hours
       FROM lesson_bookings b
       JOIN lesson_slots s ON s.id = b.slot_id
       JOIN users u ON u.id = b.student_id
       LEFT JOIN registrations r ON r.student_id = u.id AND r.instructor_id = $1 AND r.status = 'approved'
       WHERE s.instructor_id = $1
       GROUP BY u.id, u.first_name, u.last_name, u.email
       ORDER BY u.first_name`,
      [req.user.id]
    );
    res.status(200).json({ students: result.rows });
  } catch (e) { res.status(500).json({ message: "Failed.", error: e.message }); }
});

export default router;
