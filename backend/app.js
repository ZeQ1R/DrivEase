import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "./config/database.js";
import crypto from "crypto";
import { sendMail } from "./config/mailer.js";
import multer from "multer"
import path from "path";

const app = express();
app.disable("etag");

app.use("/uploads", express.static("uploads"));
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

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

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided." });
  }
  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

// Multer for school images (reuse your existing multer setup pattern)
const schoolStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/schools"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const uploadSchool = multer({ storage: schoolStorage, limits: { fileSize: 5 * 1024 * 1024 } });

const idStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/documents"),
  filename: (req, file, cb) => cb(null, "id-" + Date.now() + path.extname(file.originalname)),
});
const uploadId = multer({ storage: idStorage, limits: { fileSize: 5 * 1024 * 1024 } });

app.post("/auth/signup", async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "Email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, verification_token)
       VALUES ($1, $2, $3, $4, $5, 'student', false, $6)`,
      [firstName, lastName, email, phone || null, passwordHash, verificationToken]
    );

    const verifyLink = `${process.env.API_URL}/auth/verify-email?token=${verificationToken}`;
    sendMail({
      to: email,
      subject: "Confirm your DrivEase account",
      html: `<h2>Welcome, ${firstName}!</h2>
             <p>Please confirm your email to activate your account:</p>
             <a href="${verifyLink}">Confirm my email</a>`,
    }).catch(err => console.error("Verification email failed:", err));

    res.status(201).json({ message: "Account created. Check your email to confirm before logging in." });
  } catch (error) {
    res.status(500).json({ message: "Signup failed.", error: error.message });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const user = result.rows[0];
    const passwordIsValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordIsValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    if (!user.is_verified) {
      return res.status(403).json({ message: "Please confirm your email before logging in." });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.status(200).json({
      message: "Login successful.",
      token,
      user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed.", error: error.message });
  }
});

/* SCHOOLS */
app.get("/schools", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM driving_schools ORDER BY id ASC");
    res.status(200).json({ schools: result.rows.map(mapSchool) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch schools", error: error.message });
  }
});

app.get("/schools/:id", async (req, res) => {
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

/* REGISTRATIONS (student) */
app.get("/registrations/me", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.status, r.registered_at, s.id AS school_id, s.name AS school_name, s.city
       FROM registrations r
       JOIN driving_schools s ON s.id = r.school_id
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

app.post("/register-school", authenticate,uploadId.single("idDocument"), async (req, res) => {
  const client = await pool.connect();
  try {
    const studentId = req.user.id;
    const { schoolId, firstName, lastName, email, phone, address, postalCode, embg, dateOfBirth,licenseCategory } = req.body;

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
      `INSERT INTO registrations (student_id, school_id, status)
       VALUES ($1, $2, 'pending') RETURNING id`,
      [studentId, schoolId]
    );
    const registrationId = regResult.rows[0].id;
    await client.query(
      `INSERT INTO registration_details
       (registration_id, first_name, last_name, email, phone, address, postal_code, embg, date_of_birth,id_document_url,license_category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10)`,
      [registrationId, firstName, lastName, email, phone, address, postalCode, embg, dateOfBirth,documentUrl,licenseCategory]
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

/* SCHOOL ADMIN */
app.get("/admin/registrations", authenticate, async (req, res) => {
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
              d.id_document_url
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

app.patch("/admin/registrations/:id/status", authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }
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
      `UPDATE registrations SET status = $1 WHERE id = $2 RETURNING id, status`,
      [status, req.params.id]
    );
    res.status(200).json({ registration: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status.", error: error.message });
  }
});


app.get("/auth/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Invalid link.");

    const result = await pool.query("SELECT id FROM users WHERE verification_token = $1", [token]);
    if (result.rows.length === 0) return res.status(400).send("Invalid or expired link.");

    await pool.query(
      "UPDATE users SET is_verified = true, verification_token = NULL WHERE verification_token = $1",
      [token]
    );
    res.redirect(`${process.env.APP_URL}/login?verified=true`);
  } catch (error) {
    res.status(500).send("Verification failed.");
  }
});

// ADMIN: create a slot for their school
app.post("/admin/slots", authenticate, async (req, res) => {
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
app.get("/slots/available", authenticate, async (req, res) => {
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
app.post("/slots/:id/book", authenticate, async (req, res) => {
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

// STUDENT: my upcoming lessons
app.get("/bookings/me", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, s.slot_date, s.slot_time, s.note
       FROM lesson_bookings b
       JOIN lesson_slots s ON s.id = b.slot_id
       WHERE b.student_id = $1
       ORDER BY s.slot_date, s.slot_time`,
      [req.user.id]
    );
    res.status(200).json({ bookings: result.rows });
  } catch (e) { res.status(500).json({ message: "Failed to load bookings.", error: e.message }); }
});

app.get("/hours/me", authenticate, async (req, res) => {
  try {
    const completed = await pool.query(
      `SELECT COALESCE(SUM(s.duration_hours), 0) AS hours
      FROM lesson_bookings b
      JOIN lesson_slots s ON s.id = b.slot_id
      WHERE b.student_id = $1 AND b.attended = true AND s.slot_type = 'practical'`,
      [req.user.id]
    );
    // required hours from their approved registration
    const required = await pool.query(
      `SELECT required_hours FROM registrations
       WHERE student_id = $1 AND status = 'approved' LIMIT 1`,
      [req.user.id]
    );
    res.status(200).json({
      completed: Number(completed.rows[0].hours),
      required: required.rows[0] ? Number(required.rows[0].required_hours) : 30,
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to load hours.", error: e.message });
  }
});

// admin sees their school's bookings
app.get("/admin/bookings", authenticate, async (req, res) => {
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

// admin marks a booking attended
app.patch("/admin/bookings/:id/attended", authenticate, async (req, res) => {
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

// middleware: only platform_admin
function requirePlatformAdmin(req, res, next) {
  if (req.user.role !== 'platform_admin') {
    return res.status(403).json({ message: "Platform admin only." });
  }
  next();
}




app.post("/admin/schools", authenticate, requirePlatformAdmin, uploadSchool.single("image"), async (req, res) => {
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

    // 1. create the school_admin user account for this school
    const defaultPassword = "admin123";  // admin can change later
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const userResult = await client.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, 'school_admin', true)
       RETURNING id`,
      [name, 'Admin', email, passwordHash]
    );
    const adminUserId = userResult.rows[0].id;

    // 2. create the school, linked to that admin
    const schoolResult = await client.query(
      `INSERT INTO driving_schools
       (name, description, city, address, phone, email, price, rating, image_url, transmission, instructors_count, pass_rate, owner_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, description, city, address, phone, email, price, rating, image_url, transmission, instructors_count, pass_rate, adminUserId]
    );

    await client.query("COMMIT");
    res.status(201).json({
      school: schoolResult.rows[0],
      adminLogin: { email, password: defaultPassword },  // so the platform admin knows the credentials
    });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Failed to create school.", error: e.message });
  } finally {
    client.release();
  }
});

// UPDATE
app.put("/admin/schools/:id", authenticate, requirePlatformAdmin, uploadSchool.single("image"), async (req, res) => {
  try {
    const { name, description, city, address, phone, email, price, rating, transmission, instructors_count, pass_rate } = req.body;
    // if a new image was uploaded, use it; otherwise keep the old one
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

app.delete("/admin/schools/:id", authenticate, requirePlatformAdmin, async (req, res) => {
  try {
    const regs = await pool.query(`SELECT id FROM registrations WHERE school_id = $1 LIMIT 1`, [req.params.id]);
    if (regs.rows.length > 0) {
      return res.status(409).json({ message: "Cannot delete — this school has student registrations." });
    }
    await pool.query(`DELETE FROM driving_schools WHERE id = $1`, [req.params.id]);
    res.status(200).json({ message: "School deleted." });
  } catch (e) { res.status(500).json({ message: "Failed to delete school.", error: e.message }); }
});

app.listen(3000, () => {
  console.log("Backend server listening on port 3000");
});