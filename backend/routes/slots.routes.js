import { Router } from "express";
import pool from "../config/database.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// ADMIN: create a slot for their school
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

// STUDENT: available slots at the school they're approved to
router.get("/slots/available", authenticate, async (req, res) => {
  try {
    // find the school this student is APPROVED at
    const reg = await pool.query(
      `SELECT school_id FROM registrations WHERE student_id = $1 AND status = 'approved' LIMIT 1`,
      [req.user.id]
    );
    if (reg.rows.length === 0) return res.status(200).json({ slots: [] }); // not approved yet

    const result = await pool.query(
      `SELECT id, slot_date, slot_time,slot_type note FROM lesson_slots
       WHERE school_id = $1 AND is_booked = false
       ORDER BY slot_date, slot_time`,
      [reg.rows[0].school_id]
    );
    res.status(200).json({ slots: result.rows });
  } catch (e) { res.status(500).json({ message: "Failed to load slots.", error: e.message }); }
});

// STUDENT: book a slot (transaction — mark booked + create booking together)
router.post("/slots/:id/book", authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // lock the slot row so two students can't grab it at once
    const slot = await client.query(
      `SELECT id, is_booked FROM lesson_slots WHERE id = $1 FOR UPDATE`, [req.params.id]
    );
    if (slot.rows.length === 0 || slot.rows[0].is_booked) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "That slot is no longer available." });
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
