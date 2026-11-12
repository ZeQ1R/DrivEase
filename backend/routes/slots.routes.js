import { Router } from "express";
import pool from "../config/database.js";
import { authenticate } from "../middleware/auth.js";
import { getStudentPhase } from "../lib/phase.js";
import { notify } from "../lib/notify.js";

const router = Router();

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}


router.post("/admin/slots", authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { slotDate, slotTime, note } = req.body;
    const slotType = req.body.slotType === "practical" ? "practical" : "theory";
    const repeatWeeks = Math.min(Math.max(parseInt(req.body.repeatWeeks, 10) || 1, 1), 12);
    const duration = Number(req.body.durationHours) || 1.5;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(slotDate || "") || !/^\d{2}:\d{2}$/.test(slotTime || "")) {
      return res.status(400).json({ message: "Date and time required." });
    }
    if (duration < 0.5 || duration > 4) return res.status(400).json({ message: "Duration must be between 0.5 and 4 hours." });
    if (slotDate < new Date().toISOString().split("T")[0]) {
      return res.status(400).json({ message: "You can't create a lesson in the past." });
    }

    const school = await client.query(`SELECT id FROM driving_schools WHERE owner_user_id = $1`, [req.user.id]);
    if (school.rows.length === 0) return res.status(403).json({ message: "You don't manage a school." });
    const schoolId = school.rows[0].id;

    let instructorId = null;
    if (slotType === "practical") {
      const ins = await client.query(
        `SELECT id FROM users WHERE id = $1 AND role = 'instructor' AND school_id = $2`,
        [req.body.instructorId, schoolId]
      );
      if (ins.rows.length === 0) return res.status(400).json({ message: "Choose an instructor from your school." });
      instructorId = ins.rows[0].id;
    }

    await client.query("BEGIN");
    let created = 0;
    for (let i = 0; i < repeatWeeks; i++) {
      const date = addDays(slotDate, 7 * i);

      // no overlap: theory classes share one room, practical lessons share one instructor
      const clash = await client.query(
        `SELECT 1 FROM lesson_slots
         WHERE school_id = $1 AND slot_date = $2
           AND (($5::text = 'theory' AND slot_type = 'theory')
             OR ($5::text = 'practical' AND instructor_id = $6))
           AND slot_time < ($3::time + ($4::numeric * interval '1 hour'))
           AND (slot_time + (duration_hours * interval '1 hour')) > $3::time
         LIMIT 1`,
        [schoolId, date, slotTime, duration, slotType, instructorId]
      );
      if (clash.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: `That time overlaps another lesson on ${date}. Nothing was created.` });
      }

      await client.query(
        `INSERT INTO lesson_slots (school_id, instructor_id, slot_date, slot_time, note, slot_type, duration_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [schoolId, instructorId, date, slotTime, (note || "").trim() || null, slotType, duration]
      );
      created++;
    }
    await client.query("COMMIT");
    res.status(201).json({ created });
  } catch (e) {
    console.error("create slot failed:", e.message);
    await client.query("ROLLBACK").catch(() => {});
    res.status(500).json({ message: "Failed to create lesson.", error: e.message });
  } finally { client.release(); }
});

router.delete("/admin/slots/:id", authenticate, async (req, res) => {
  try {
    const school = await pool.query(`SELECT id FROM driving_schools WHERE owner_user_id = $1`, [req.user.id]);
    if (school.rows.length === 0) return res.status(403).json({ message: "You don't manage a school." });

    const result = await pool.query(
      `DELETE FROM lesson_slots WHERE id = $1 AND school_id = $2 AND is_booked = false RETURNING id`,
      [req.params.id, school.rows[0].id]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ message: "This lesson can't be deleted. It is booked or doesn't exist." });
    }
    res.status(200).json({ message: "Lesson deleted." });
  } catch (e) { res.status(500).json({ message: "Failed to delete lesson.", error: e.message }); }
});


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
      // once all required practical hours are done, there's nothing left to book
      if (p.practicalDone) {
        return res.status(200).json({ slots: [], phase: p.phase, done: true });
      }
      result = await pool.query(
        `SELECT id, slot_date, slot_time, slot_type, note, duration_hours FROM lesson_slots
         WHERE school_id = $1 AND is_booked = false AND slot_type = 'practical' AND instructor_id = $2
         ORDER BY slot_date, slot_time`,
        [p.schoolId, p.instructorId]
      );
    } else {
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
      `SELECT id, is_booked, school_id, instructor_id, slot_type, slot_date FROM lesson_slots WHERE id = $1 FOR UPDATE`,
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
      if (p.practicalDone) {
        ok = false;
        reason = "You've completed all your required practical hours.";
      } else {
        ok = s.slot_type === "practical" && s.instructor_id === p.instructorId;
      }
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

    if (s.slot_type === "practical" && s.instructor_id) {
      const who = await pool.query(`SELECT first_name, last_name FROM users WHERE id = $1`, [req.user.id]);
      const name = who.rows[0] ? `${who.rows[0].first_name} ${who.rows[0].last_name}` : "A student";
      notify(s.instructor_id, `${name} booked a practical lesson on ${s.slot_date?.toISOString?.().slice(0, 10) ?? s.slot_date}.`, "info", "/instructor");
    }

    res.status(201).json({ message: "Lesson booked." });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Failed to book.", error: e.message });
  } finally { client.release(); }
});

export default router;
