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
  { firstName: "Tamara",   lastName: "Tami",  email: "tamara@test.com",   phone: "070111008", role: "student" },
  { firstName: "Yamal",   lastName: "Yami",  email: "yamal@test.com",   phone: "070111008", role: "student" },
  { firstName: "Fitim",    lastName: "Berisha",   email: "fitim@test.com",    phone: "070111011", role: "student" },
  { firstName: "Vjollca",  lastName: "Ahmeti",    email: "vjollca@test.com",  phone: "070111012", role: "student" },
  { firstName: "Besnik",   lastName: "Thaqi",     email: "besnik@test.com",   phone: "070111013", role: "student" },
  { firstName: "Mirlinda", lastName: "Osmani",    email: "mirlinda@test.com", phone: "070111014", role: "student" },
  { firstName: "Genc",     lastName: "Zeka",      email: "genc@test.com",     phone: "070111015", role: "student" },
  { firstName: "Dafina",   lastName: "Morina",    email: "dafina@test.com",   phone: "070111016", role: "student" },
  { firstName: "Ilir",     lastName: "Sadiku",    email: "ilir@test.com",     phone: "070111017", role: "student" },
  { firstName: "Adelina",  lastName: "Bytyqi",    email: "adelina@test.com",  phone: "070111018", role: "student" },
  { firstName: "Egzon",    lastName: "Rrahmani",  email: "egzon@test.com",    phone: "070111019", role: "student" },
  { firstName: "Sara",     lastName: "Hajdari",   email: "sara@test.com",     phone: "070111020", role: "student" },
  { firstName: "Petrit",   lastName: "Bala",      email: "petrit@test.com",   phone: "070111021", role: "student" },
  { firstName: "Lumnije",  lastName: "Gjoni",     email: "lumnije@test.com",  phone: "070111022", role: "student" },
  { firstName: "Naim",     lastName: "Curri",     email: "naim@test.com",     phone: "070111023", role: "student" },
  { firstName: "Diellza",  lastName: "Maloku",    email: "diellza@test.com",  phone: "070111024", role: "student" },
  { firstName: "Bardh",    lastName: "Lleshi",    email: "bardh@test.com",    phone: "070111025", role: "student" },
  { firstName: "Erza",     lastName: "Kelmendi",  email: "erza@test.com",     phone: "070111026", role: "student" },
  { firstName: "Shpetim",  lastName: "Rama",      email: "shpetim@test.com",  phone: "070111027", role: "student" },
  { firstName: "Vesa",     lastName: "Hoxha",     email: "vesa@test.com",     phone: "070111028", role: "student" },
  { firstName: "Endrit",   lastName: "Mustafa",   email: "endrit@test.com",   phone: "070111029", role: "student" },
  { firstName: "Rina",     lastName: "Behluli",   email: "rina@test.com",     phone: "070111030", role: "student" },
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