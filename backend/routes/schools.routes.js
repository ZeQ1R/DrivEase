import { Router } from "express";
import bcrypt from "bcrypt";
import pool from "../config/database.js";
import { authenticate, requirePlatformAdmin } from "../middleware/auth.js";
import { uploadSchool } from "../middleware/upload.js";

const router = Router();

function mapSchool(row) {
  return {
    id: row.id,
    name: row.name,
    image: { src: `uploads/schools/${row.image_url}`, alt: `${row.name} building` },
    rating: String(row.rating),
    price: String(row.price),
    description: row.description,
    city: row.city,
    address: row.address,
    phone: row.phone,
    email: row.email,
    features: {
      feature1: row.transmission,
      feature2: `${row.instructors_count} instructors`,
      feature3: `${row.pass_rate}% pass rate`,
    },
  };
}

router.get("/schools", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM driving_schools ORDER BY id ASC");
    res.status(200).json({ schools: result.rows.map(mapSchool) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch schools", error: error.message });
  }
});

router.get("/schools/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM driving_schools WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "School not found" });
    }
    res.status(200).json({ school: mapSchool(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch school", error: error.message });
  }
});

router.post("/admin/schools", authenticate, requirePlatformAdmin, uploadSchool.single("image"), async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, description, city, address, phone, email, transmission } = req.body;
    const price = req.body.price || null;
    const rating = req.body.rating || 0;
    const instructors_count = req.body.instructors_count || 0;
    const pass_rate = req.body.pass_rate || 0;
    const image_url = req.file ? req.file.filename : null;

    const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    await client.query("BEGIN");

    const defaultPassword = "admin123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const userResult = await client.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, 'school_admin', true)
       RETURNING id`,
      [name, 'Admin', email, passwordHash]
    );
    const adminUserId = userResult.rows[0].id;

    const schoolResult = await client.query(
      `INSERT INTO driving_schools
       (name, description, city, address, phone, email, price, rating, image_url, transmission, instructors_count, pass_rate, owner_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, description, city, address, phone, email, price, rating, image_url, transmission, instructors_count, pass_rate, adminUserId]
    );

    await client.query("COMMIT");
    res.status(201).json({
      school: schoolResult.rows[0],
      adminLogin: { email, password: defaultPassword },
    });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Failed to create school.", error: e.message });
  } finally {
    client.release();
  }
});

router.put("/admin/schools/:id", authenticate, requirePlatformAdmin, uploadSchool.single("image"), async (req, res) => {
  try {
    const { name, description, city, address, phone, email, price, rating, transmission, instructors_count, pass_rate } = req.body;
    let image_url = req.file ? req.file.filename : null;
    const result = await pool.query(
      `UPDATE driving_schools SET
         name=$1, description=$2, city=$3, address=$4, phone=$5, email=$6,
         price=$7, rating=$8, transmission=$9, instructors_count=$10, pass_rate=$11,
         image_url = COALESCE($12, image_url)
       WHERE id=$13 RETURNING *`,
      [name, description, city, address, phone, email, price, rating, transmission, instructors_count, pass_rate, image_url, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "School not found." });
    res.status(200).json({ school: result.rows[0] });
  } catch (e) { res.status(500).json({ message: "Failed to update school.", error: e.message }); }
});

router.delete("/admin/schools/:id", authenticate, requirePlatformAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const school = await client.query(`SELECT owner_user_id FROM driving_schools WHERE id = $1`, [req.params.id]);
    if (school.rows.length === 0) {
      return res.status(404).json({ message: "School not found." });
    }

    const active = await client.query(
      `SELECT id FROM registrations WHERE school_id = $1 AND status IN ('pending', 'approved') LIMIT 1`,
      [req.params.id]
    );
    if (active.rows.length > 0) {
      return res.status(409).json({ message: "Cannot delete — this school has active student registrations." });
    }

    await client.query("BEGIN");
    await client.query(`DELETE FROM registrations WHERE school_id = $1`, [req.params.id]);
    await client.query(`DELETE FROM lesson_slots WHERE school_id = $1`, [req.params.id]);
    await client.query(`DELETE FROM users WHERE school_id = $1 AND role = 'instructor'`, [req.params.id]);
    await client.query(`DELETE FROM driving_schools WHERE id = $1`, [req.params.id]);
    if (school.rows[0].owner_user_id) {
      await client.query(`DELETE FROM users WHERE id = $1 AND role = 'school_admin'`, [school.rows[0].owner_user_id]);
    }
    await client.query("COMMIT");

    res.status(200).json({ message: "School deleted." });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Failed to delete school.", error: e.message });
  } finally {
    client.release();
  }
});

export default router;
