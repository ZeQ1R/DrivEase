import bcrypt from "bcrypt";
import pool from "./config/database.js";

const admins = [
  { email: "momento@gmail.com",  firstName: "Momento", lastName: "Admin", schoolId: 1 },
  { email: "uno1@gmail.com",     firstName: "Uno1",    lastName: "Admin", schoolId: 2 },
  { email: "autoshkollasharr@gmail.com",     firstName: "Sharr",    lastName: "Admin", schoolId: 3 },
  { email: "golfd@gmail.com",    firstName: "GolfD",   lastName: "Admin", schoolId: 4 },
  { email: "og@gmail.com",       firstName: "OG",      lastName: "Admin", schoolId: 5 },
  { email: "hiti@gmail.com",     firstName: "HITI",    lastName: "Admin", schoolId: 6 },
];

const PASSWORD = "admin123"; // same password for all, change if you want

for (const a of admins) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  // create the admin user (skip if email already exists)
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [a.email]);
  let userId;
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
    await pool.query("UPDATE users SET role='school_admin', is_verified=true WHERE id=$1", [userId]);
  } else {
    const res = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, 'school_admin', true) RETURNING id`,
      [a.firstName, a.lastName, a.email, hash]
    );
    userId = res.rows[0].id;
  }
  // link the school to this admin
  await pool.query("UPDATE driving_schools SET owner_user_id = $1 WHERE id = $2", [userId, a.schoolId]);
  console.log(`Linked ${a.email} -> school ${a.schoolId}`);
}

console.log("Done. All school admins created and linked.");
process.exit(0);