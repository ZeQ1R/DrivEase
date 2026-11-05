import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { notify } from "../lib/notify.js";
import pool from "../config/database.js";


const router = Router()

async function getMySchool(userId) {
    const r = await pool.query(`SELECT id, name FROM driving_schools WHERE owner_user_id = $1`, [userId])
}

async function isSchoolStudent(schoolId, studentId) {
    const r = await pool.query(
        `SELECT 1 FROM registrations WHERE school_id = $1 AND student_id = $2 LIMIT 1`,
        [schoolId, studentId]
    )
    return r.rows.length > 0
}

function cleanBody(body){
    const text = typeof body === "string" ? body.trim() : ""
    if(!text || text.length > 2000) return null
    return text
}


router.get("/admin/conversations", authenticate, async(req,res) => {
    try{
        const school = await getMySchool(req.user.id)
        if (!school) return res.status(403).json({message: "You don't manage a school."})

        const result = await pool.query(
        `SELECT u.id AS student_id, u.first_name, u.last_name, u.email,
                lm.body AS last_body, lm.sender_role AS last_sender, lm.created_at AS last_at,
                COALESCE(un.unread, 0)::int AS unread
        FROM users u
        JOIN (SELECT DISTINCT student_id FROM registrations WHERE school_id = $1) s ON s.student_id = u.id
        LEFT JOIN LATERAL (
            SELECT body, sender_role, created_at FROM messages
            WHERE school_id = $1 AND student_id = u.id
            ORDER BY created_at DESC LIMIT 1
        ) lm ON true
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS unread FROM messages
            WHERE school_id = $1 AND student_id = u.id AND sender_role = 'student' AND read_at IS NULL
        ) un ON true
        ORDER BY lm.created_at DESC NULLS LAST, u.first_name`,
        [school.id]
        );
        res.status(200).json({conversations : result.rows})
    }   catch (e) {res.json(500).json({message: "Failed", error: e.message  })}
})

router.get("/admin/conversations/:studentId/messages", authenticate, async(req,res) => {
    try{
        const school = await getMySchool(req.user.id)
        if (!school) return res.status(403).json({message: "You don't manage a school."})
        const studentId = Number(req.params.studentId)
        if (!(await isSchoolStudent(school.id,studentId))) return res.status(404).json({message: "Student not found."})

        await pool.query(
        `UPDATE messages SET read_at = NOW()
        WHERE school_id = $1 AND student_id = $2 AND sender_role = 'student' AND read_at IS NULL`,
        [school.id, studentId]
        );
        const result = await pool.query(
        `SELECT id, sender_role, body, created_at FROM messages
        WHERE school_id = $1 AND student_id = $2 ORDER BY created_at, id`,
        [school.id, studentId]
        );
        res.status(200).json({message: result.rows})
    } catch (e) {res.status(500).json({message: "Failed", error: e.message} )}
})

router.post("/admin/conversations/:studentId/messages", authenticate, async(req,res) => {
    try{
        const school = await getMySchool(req.user.id)
        if (!school) return res.status(403).json({message: "You don't manage a school."})
        const studentId = Number(req.params.studentId)
        if (!(await isSchoolStudent(school.id,studentId))) return res.status(404).json({message: "Student not found."})

        const body = cleanBody(req.body?.body)
        if (!body) return res.status(400).json({message: "Write a message"})

        const result = await pool.query(
            `INSERT INTO messages (school_id, student_id, sender_role, body)
            VALUES ($1, $2, 'school', $3) RETURNING id, sender_role, body, created_at`,
            [school.id, studentId, body]
        );
        notify(studentId, `New message from ${school.name}.` , "info", "/student-dashboard")
        res.status(201).json({message: result.rows[0]})
    } catch (e) {res.status(500).json({message: "Failed", error: e.message})}
})

async function studentSchool(studentId) {
    const r = await pool.query(
        `SELECT s.id, s.name FROM registrations r JOIN driving_schools s ON s.id = r.school_id
        WHERE r.student_id = $1 ORDER BY r.registered_at DESC LIMIT 1`,
        [studentId]
    )
    return r.rows[0] || null
}

router.get("/messages/me", authenticate , async(req,res) => {
    try{
        const school = await studentSchool(req.user.id)
        if (!school) return res.status(200).json({school : null, messages: []})
            await pool.query(
        `UPDATE messages SET read_at = NOW()
        WHERE school_id = $1 AND student_id = $2 AND sender_role = 'school' AND read_at IS NULL`,
        [school.id, req.user.id]
        );
        const result = await pool.query(
        `SELECT id, sender_role, body, created_at FROM messages
        WHERE school_id = $1 AND student_id = $2 ORDER BY created_at, id`,
        [school.id, req.user.id]
        );

        res.status(200).json({school, messages: result.rows})

    }catch (e) {res.status(500).json({message : "Failed", error: e.message})}
})

router.post("/messages/me" , authenticate, async(req,res) => {
    try{
        const school = await studentSchool(req.user.id)
        if (!school) return res.status(400).json({ message: "You're not registered to a school."})
        const body = await cleanBody(req.body?.body)
        if (!body) return res.status(400).json({message: "Write a message"})
        const result = await pool.query(
            `INSERT INTO messages (school_id, student_id, sender_role, body)
            VALUES ($1, $2, 'student', $3) RETURNING id, sender_role, body, created_at`,
            [school.id, req.user.id, body]
            );
        const owner = await pool.query(`SELECT owner_user_id FROM driving_schools WHERE id = $1`, [school.id]);
        notify(owner.rows[0]?.owner_user_id, "You have a new message from a student.", "info", "/school-admin-dashboard/messages")
        res.status(201).json({message: result.rows[0]})
    }catch (e) {res.status(500).json({message : "Failed", error: e.message})}
})

export default router