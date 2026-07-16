import { Router } from "express";
import pool from "../config/database.js";
import { authenticate } from "../middleware/auth.js";
import { getStudentPhase } from "../lib/phase.js";

const router = Router();


// SCHOOL ADMIN: create a THEORY class slot (school-wide, no instructor)
router.post("/admin/slots", authenticate, async (req, res) => {
  try {
    const { slotDate, slotTime, note, durationHours } = req.body;
    if (!slotDate || !slotTime) return res.status(400).json({ message: "Date and time required." });

    const schoolRes = await pool.query(
      `SELECT id FROM driving_schools WHERE owner_user_id = $1`, [req.user.id]
    );
    if (schoolRes.rows.length === 0) return res.status(403).json({ message: "You don't manage a school." });

    const result = await pool.query(
      `INSERT INTO lesson_slots (school_id, slot_date, slot_time, note, slot_type, duration_hours)
       VALUES ($1, $2, $3, $4, 'theory', $5) RETURNING *`,
      [schoolRes.rows[0].id, slotDate, slotTime, note || null, durationHours || 1.5]
    );
    res.status(201).json({ slot: result.rows[0] });
  } catch (e) { res.status(500).json({ message: "Failed to create slot.", error: e.message }); }
});


// STUDENT: slots to book — theory slots during the theory phase, the assigned
// instructor's practical slots during the practical phase.
router.get("/slots/available", authenticate, async (req, res) => {
  try {
    const p = await getStudentPhase(pool, req.user.id);
    if (!p) return res.status(200).json({ slots: [], phase: "none" });

    let result;
    if (p.phase === "theory") {
      result = await pool.query(
        `SELECT id, slot_date, slot_time, slot_type, note, duration_hours FROM lesson_slots
         WHERE school_id = $1 AND is_booked = false AND slot_type = 'theory'
         ORDER BY slot_date, slot_time`,
        [p.schoolId]
      );
    } else if (p.phase === "practical") {
      result = await pool.query(
        `SELECT id, slot_date, slot_time, slot_type, note, duration_hours FROM lesson_slots
         WHERE school_id = $1 AND is_booked = false AND slot_type = 'practical' AND instructor_id = $2
         ORDER BY slot_date, slot_time`,
        [p.schoolId, p.instructorId]
      );
    } else {
      // awaiting-instructor — nothing to book until the school assigns an instructor
      return res.status(200).json({ slots: [], phase: p.phase });
    }
    res.status(200).json({ slots: result.rows, phase: p.phase });
  } catch (e) { res.status(500).json({ message: "Failed to load slots.", error: e.message }); }
});

router.post("/slots/:id/book", authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const slot = await client.query(
      `SELECT id, is_booked, school_id, instructor_id, slot_type FROM lesson_slots WHERE id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (slot.rows.length === 0 || slot.rows[0].is_booked) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "That slot is no longer available." });
    }

    const p = await getStudentPhase(client, req.user.id);
    if (!p) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "You don't have an approved registration." });
    }

    const s = slot.rows[0];
    let ok = false;
    let reason = "This slot isn't available to you right now.";
    if (p.phase === "theory") {
      ok = s.slot_type === "theory" && s.school_id === p.schoolId;
      if (s.slot_type === "practical") reason = "Finish your theory classes before booking practical lessons.";
    } else if (p.phase === "practical") {
      ok = s.slot_type === "practical" && s.instructor_id === p.instructorId;
    } else {
      reason = "Your theory is complete — waiting for the school to assign your instructor.";
    }
    if (!ok) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: reason });
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
