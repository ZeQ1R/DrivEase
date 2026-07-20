import bcrypt from "bcrypt";
import pool from "./config/database.js";

const PASSWORD = "test123";

const users = [
  { firstName: "Ana",      lastName: "Berisha",   email: "ana@test.com",      phone: "070111001", role: "student" },
  { firstName: "Bujar",    lastName: "Ismaili",   email: "bujar@test.com",    phone: "070111002", role: "student" },
  { firstName: "Elona",    lastName: "Markaj",    email: "elona@test.com",    phone: "070111003", role: "student" },
  { firstName: "Kushtrim", lastName: "Gashi",     email: "kushtrim@test.com", phone: "070111004", role: "student" },
  { firstName: "Leotrim",  lastName: "Rexhepi",   email: "leotrim@test.com",  phone: "070111005", role: "student" },
  { firstName: "Albulena", lastName: "Halimi",    email: "albulena@test.com", phone: "070111006", role: "student" },
  { firstName: "Blerta",   lastName: "Krasniqi",  email: "blerta@test.com",   phone: "070111007", role: "student" },
  { firstName: "Driton",   lastName: "Kastrati",  email: "driton@test.com",   phone: "070111008", role: "student" },
  { firstName: "Arta",     lastName: "Shala",     email: "arta@test.com",     phone: "070111009", role: "student" },
  { firstName: "Valon",    lastName: "Dervishi",  email: "valon@test.com",    phone: "070111010", role: "student" },
  { firstName: "Arben",    lastName: "Krasniqi",  email: "arben@test.com",    phone: "070222001", role: "instructor", schoolId: 3 },
  { firstName: "Teuta",    lastName: "Berisha",   email: "teuta@test.com",    phone: "070222002", role: "instructor", schoolId: 3 },
];

for (const u of users) {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [u.email]);
  if (existing.rows.length > 0) {
    console.log(`Kaluar (ekziston): ${u.email}`);
    continue;
  }

  const hash = await bcrypt.hash(PASSWORD, 10);
  const res = await pool.query(
    `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, school_id)
     VALUES ($1, $2, $3, $4, $5, $6, true, $7)
     RETURNING id, email, role`,
    [u.firstName, u.lastName, u.email, u.phone, hash, u.role, u.schoolId || null]
  );
  console.log(`Krijuar: ${res.rows[0].email} (${res.rows[0].role})`);
}

console.log("\nMbaroi. Të gjithë përdoruesit kanë fjalëkalimin:", PASSWORD);
process.exit(0);