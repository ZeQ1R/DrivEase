import { Router } from "express";
import pool from "../config/database.js";
import { authenticate } from "../middleware/auth.js";
import { uploadId } from "../middleware/upload.js";

const router = Router();

router.get("/registrations/me", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.status, r.registered_at, s.id AS school_id, s.name AS school_name, s.city,
              i.first_name AS instructor_first_name, i.last_name AS instructor_last_name
       FROM registrations r
       JOIN driving_schools s ON s.id = r.school_id
       LEFT JOIN users i ON i.id = r.instructor_id
       WHERE r.student_id = $1
       ORDER BY r.registered_at DESC
       LIMIT 1`,
      [req.user.id]
    );
    res.status(200).json({ registration: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch registration.", error: error.message });
  }
});

router.post("/register-school", authenticate, uploadId.single("idDocument"), async (req, res) => {
  const client = await pool.connect();
  try {
    const studentId = req.user.id;
    const { schoolId, firstName, lastName, email, phone, address, postalCode, embg, dateOfBirth, licenseCategory } = req.body;

    if (!schoolId || !firstName || !lastName || !email || !dateOfBirth) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const dob = new Date(dateOfBirth);
    const documentUrl = req.file ? `uploads/documents/${req.file.filename}` : null;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    if (age < 18) {
      return res.status(400).json({ message: "You must be at least 18 years old to register." });
    }

    const existing = await client.query(
      `SELECT id FROM registrations WHERE student_id = $1 AND status IN ('pending', 'approved')`,
      [studentId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "You already have an active registration." });
    }

    await client.query("BEGIN");
    const regResult = await client.query(
      `INSERT INTO registrations (student_id, school_id, status, required_hours)
       VALUES ($1, $2, 'pending', 40) RETURNING id`,
      [studentId, schoolId]
    );
    const registrationId = regResult.rows[0].id;
    await client.query(
      `INSERT INTO registration_details
       (registration_id, first_name, last_name, email, phone, address, postal_code, embg, date_of_birth,id_document_url,license_category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10,$11)`,
      [registrationId, firstName, lastName, email, phone, address, postalCode, embg, dateOfBirth, documentUrl, licenseCategory]
    );
    await client.query("COMMIT");
    res.status(201).json({ message: "Registration submitted.", registrationId });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Failed to submit registration.", error: error.message });
  } finally {
    client.release();
  }
});

router.get("/admin/registrations", authenticate, async (req, res) => {
  try {
    const schoolResult = await pool.query(
      `SELECT id, name FROM driving_schools WHERE owner_user_id = $1`,
      [req.user.id]
    );
    if (schoolResult.rows.length === 0) {
      return res.status(403).json({ message: "You don't manage a school." });
    }
    const school = schoolResult.rows[0];   // now has { id, name }

    const result = await pool.query(
      `SELECT r.id, r.status, r.registered_at,
              d.first_name, d.last_name, d.email, d.phone,
              d.address, d.postal_code, d.embg, d.date_of_birth,
              d.id_document_url, d.license_category AS "licenseCategory"
       FROM registrations r
       JOIN registration_details d ON d.registration_id = r.id
       WHERE r.school_id = $1
       ORDER BY r.registered_at DESC`,
      [school.id]
    );

    res.status(200).json({
      schoolName: school.name,
      registrations: result.rows,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch registrations.", error: error.message });
  }
});

router.patch("/admin/registrations/:id/status", authenticate, async (req, res) => {
  try {
    const { status, instructorId } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    if (status === "approved" && !instructorId) {
      return res.status(400).json({ message: "Please assign an instructor." });
    }

    // verify this registration belongs to the admin's school
    const check = await pool.query(
      `SELECT r.id FROM registrations r
       JOIN driving_schools s ON s.id = r.school_id
       WHERE r.id = $1 AND s.owner_user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ message: "Not your school's registration." });
    }

    if (status === "approved") {
      const instr = await pool.query(
        `SELECT u.id FROM users u
         JOIN driving_schools s ON s.id = u.school_id
         WHERE u.id = $1 AND u.role = 'instructor' AND s.owner_user_id = $2`,
        [instructorId, req.user.id]
      );
      if (instr.rows.length === 0) {
        return res.status(400).json({ message: "Invalid instructor for this school." });
      }
    }

    const result = await pool.query(
      `UPDATE registrations
       SET status = $1, instructor_id = $2
       WHERE id = $3
       RETURNING id, status, instructor_id`,
      [status, status === "approved" ? instructorId : null, req.params.id]
    );

    res.status(200).json({ registration: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status.", error: error.message });
  }
});

// SCHOOL ADMIN: edit an applicant's registration details
router.put("/admin/registrations/:id", authenticate, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address, postalCode, embg, licenseCategory } = req.body;
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: "First name, last name and email are required." });
    }

    // registration must belong to the admin's school
    const check = await pool.query(
      `SELECT r.id FROM registrations r
       JOIN driving_schools s ON s.id = r.school_id
       WHERE r.id = $1 AND s.owner_user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ message: "Not your school's registration." });
    }

    const result = await pool.query(
      `UPDATE registration_details SET
         first_name = $1, last_name = $2, email = $3, phone = $4,
         address = $5, postal_code = $6, embg = $7, license_category = $8
       WHERE registration_id = $9
       RETURNING first_name, last_name, email, phone, address, postal_code, embg, license_category`,
      [firstName, lastName, email, phone || null, address || null, postalCode || null, embg || null, licenseCategory || null, req.params.id]
    );
    res.status(200).json({ details: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to update registration.", error: error.message });
  }
});

// SCHOOL ADMIN: delete a registration (removes the enrollment; details cascade)
router.delete("/admin/registrations/:id", authenticate, async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT r.id FROM registrations r
       JOIN driving_schools s ON s.id = r.school_id
       WHERE r.id = $1 AND s.owner_user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ message: "Not your school's registration." });
    }

    await pool.query(`DELETE FROM registrations WHERE id = $1`, [req.params.id]);
    res.status(200).json({ message: "Registration deleted." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete registration.", error: error.message });
  }
});

export default router;
