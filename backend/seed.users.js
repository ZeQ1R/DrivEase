import bcrypt from "bcrypt";
import pool from "./config/database.js";

const PASSWORD = "test123"; 

const users = [
  { firstName: "Ana",    lastName: "Petrovska", email: "ana@test.com",    phone: "070111222", role: "student" },
  { firstName: "Bujar",  lastName: "Ismaili",   email: "bujar@test.com",  phone: "070333444", role: "student" },
  { firstName: "Elena",  lastName: "Markoska",  email: "elena@test.com",  phone: "070555666", role: "student" },
  { firstName: "Kushtrim",    lastName: "Kushtrim", email: "kushtrim@test.com",    phone: "070111222", role: "student" },
  { firstName: "Leotrim",  lastName: "Ismaili",   email: "leotrim@test.com",  phone: "070333444", role: "student" },
  { firstName: "Albulena",  lastName: "Albulena",  email: "albulena@test.com",  phone: "070555666", role: "student" },
  { firstName: "Arben",  lastName: "Krasniqi",  email: "arben@test.com",  phone: "070777888", role: "instructor", schoolId: 3 },
];

for (const u of users) {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [u.email]);
  if (existing.rows.length > 0) {
    console.log(`Skipped (exists): ${u.email}`);
    continue;
  }

  const hash = await bcrypt.hash(PASSWORD, 10);
  const res = await pool.query(
    `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, school_id)
     VALUES ($1, $2, $3, $4, $5, $6, true, $7)
     RETURNING id, email, role`,
    [u.firstName, u.lastName, u.email, u.phone, hash, u.role, u.schoolId || null]
  );
  console.log(`Created: ${res.rows[0].email} (${res.rows[0].role}) — password: ${PASSWORD}`);
}

console.log("\nDone. All test users have password:", PASSWORD);
process.exit(0);