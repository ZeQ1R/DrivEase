import { Router } from "express";
import pool from "../config/database.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();


router.post("/admin/slots", authenticate, async (req, res) => {
  try {
    const { slotDate, slotTime, note, slotType, durationHours } = req.body;
    const schoolRes = await pool.query(
      `SELECT id FROM driving_schools WHERE owner_user_id = $1`, [req.user.id]
    );
    if (schoolRes.rows.length === 0) return res.status(403).json({ message: "You don't manage a school." });

    const result = await pool.query(
      `INSERT INTO lesson_slots (school_id, slot_date, slot_time, note, slot_type, duration_hours)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [schoolRes.rows[0].id, slotDate, slotTime, note || null, slotType || 'practical', durationHours || 1.5]
    );
    res.status(201).json({ slot: result.rows[0] });
  } catch (e) { res.status(500).json({ message: "Failed to create slot.", error: e.message }); }
});


router.get("/slots/available", authenticate, async (req, res) => {
  try {
    const reg = await pool.query(
      `SELECT school_id, instructor_id FROM registrations WHERE student_id = $1 AND status = 'approved' LIMIT 1`,
      [req.user.id]
    );
    if (reg.rows.length === 0) return res.status(200).json({ slots: [] }); 

    const { school_id, instructor_id } = reg.rows[0];
    const result = await pool.query(
      `SELECT id, slot_date, slot_time, slot_type, note FROM lesson_slots
       WHERE school_id = $1 AND is_booked = false
         AND (instructor_id IS NULL OR instructor_id = $2)
       ORDER BY slot_date, slot_time`,
      [school_id, instructor_id]
    );
    res.status(200).json({ slots: result.rows });
  } catch (e) { res.status(500).json({ message: "Failed to load slots.", error: e.message }); }
});

router.post("/slots/:id/book", authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const slot = await client.query(
      `SELECT id, is_booked, school_id, instructor_id FROM lesson_slots WHERE id = $1 FOR UPDATE`, [req.params.id]
    );
    if (slot.rows.length === 0 || slot.rows[0].is_booked) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "That slot is no longer available." });
    }
    const reg = await client.query(
      `SELECT school_id, instructor_id FROM registrations WHERE student_id = $1 AND status = 'approved' LIMIT 1`,
      [req.user.id]
    );
    const registration = reg.rows[0];
    const { school_id, instructor_id } = slot.rows[0];
    const ownsSlot = registration
      && registration.school_id === school_id
      && (instructor_id === null || instructor_id === registration.instructor_id);
    if (!ownsSlot) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "This slot isn't available to you." });
    }

    await client.query(`UPDATE lesson_slots SET is_booked = true WHERE id = $1`, [req.params.id]);
    await client.query(
      `INSERT INTO lesson_bookings (slot_id, student_id) VALUES ($1, $2)`,
      [req.params.id, req.user.id]
    );
    await client.query("COMMIT");
    res.status(201).json({ message: "Lesson booked." });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Failed to book.", error: e.message });
  } finally { client.release(); }
});

export default router;
