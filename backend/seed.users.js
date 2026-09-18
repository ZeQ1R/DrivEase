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
  { firstName: "Agron",      lastName: "Zeqiri",    email: "agron@test.com",      phone: "070111031", role: "student" },
  { firstName: "Blerim",     lastName: "Brahimi",   email: "blerim@test.com",    phone: "070111032", role: "student" },
  { firstName: "Donika",     lastName: "Mustafi",   email: "donika@test.com",    phone: "070111033", role: "student" },
  { firstName: "Fatlum",     lastName: "Idrizi",    email: "fatlum@test.com",     phone: "070111034", role: "student" },
  { firstName: "Gresa",      lastName: "Rexha",     email: "gresa@test.com",       phone: "070111035", role: "student" },
  { firstName: "Hana",       lastName: "Selimi",    email: "hana@test.com",       phone: "070111036", role: "student" },
  { firstName: "Ismet",      lastName: "Beqiri",    email: "ismet@test.com",      phone: "070111037", role: "student" },
  { firstName: "Jeta",       lastName: "Duraku",    email: "jeta@test.com",       phone: "070111038", role: "student" },
  { firstName: "Kaltrina",   lastName: "Haliti",    email: "kaltrina@test.com",   phone: "070111039", role: "student" },
  { firstName: "Labinot",    lastName: "Shabani",   email: "labinot@test.com",   phone: "070111040", role: "student" },
  { firstName: "Mentor",     lastName: "Zenuni",    email: "mentor@test.com",     phone: "070111041", role: "student" },
  { firstName: "Nora",       lastName: "Neziri",    email: "nora@test.com",       phone: "070111042", role: "student" },
  { firstName: "Orges",      lastName: "Alimi",     email: "orges@test.com",       phone: "070111043", role: "student" },
  { firstName: "Premtim",    lastName: "Ramadani",  email: "premtim@test.com",  phone: "070111044", role: "student" },
  { firstName: "Qendresa",   lastName: "Ferati",    email: "qendresa@test.com",   phone: "070111045", role: "student" },
  { firstName: "Rron",       lastName: "Muriqi",    email: "rron@test.com",       phone: "070111046", role: "student" },
  { firstName: "Skender",    lastName: "Emini",     email: "skender@test.com",     phone: "070111047", role: "student" },
  { firstName: "Time",       lastName: "Xhaferi",   email: "time@test.com",      phone: "070111048", role: "student" },
  { firstName: "Uran",       lastName: "Kajtazi",   email: "uran@test.com",      phone: "070111049", role: "student" },
  { firstName: "Valbona",    lastName: "Bekteshi",  email: "valbona@test.com",  phone: "070111050", role: "student" },
  { firstName: "Xhevat",     lastName: "Aliu",      email: "xhevat@test.com",       phone: "070111051", role: "student" },
  { firstName: "Yll",        lastName: "Sopjani",   email: "yll@test.com",       phone: "070111052", role: "student" },
  { firstName: "Zamira",     lastName: "Salihu",    email: "zamira@test.com",     phone: "070111053", role: "student" },
  { firstName: "Adnan",      lastName: "Ademi",     email: "adnan@test.com",       phone: "070111054", role: "student" },
  { firstName: "Blendi",     lastName: "Latifi",    email: "blendi@test.com",     phone: "070111055", role: "student" },
  { firstName: "Enis",       lastName: "Balaj",     email: "enis@test.com",        phone: "070111057", role: "student" },
  { firstName: "Flaka",      lastName: "Gerguri",   email: "flaka@test.com",     phone: "070111058", role: "student" },
  { firstName: "Granit",     lastName: "Bytyci",    email: "granit@test.com",     phone: "070111059", role: "student" },
  { firstName: "Hekuran",    lastName: "Vokshi",    email: "hekuran@test.com",    phone: "070111060", role: "student" },
  { firstName: "Ines",       lastName: "Halili",    email: "ines@test.com",       phone: "070111061", role: "student" },
  { firstName: "Jonida",     lastName: "Ibrahimi",  email: "jonida@test.com",   phone: "070111062", role: "student" },
  { firstName: "Kreshnik",   lastName: "Musliu",    email: "kreshnik@test.com",   phone: "070111063", role: "student" },
  { firstName: "Liridona",   lastName: "Kryeziu",   email: "liridona@test.com",  phone: "070111064", role: "student" },
  { firstName: "Muhamer",    lastName: "Sherifi",   email: "muhamer@test.com",   phone: "070111065", role: "student" },
  { firstName: "Nita",       lastName: "Behrami",   email: "nita@test.com",      phone: "070111066", role: "student" },
  { firstName: "Olsi",       lastName: "Gashi",     email: "olsi@test.com",        phone: "070111067", role: "student" },
  { firstName: "Perparim",   lastName: "Rexhepi",   email: "perparim@test.com",  phone: "070111068", role: "student" },
  { firstName: "Qazim",      lastName: "Halimi",    email: "qazim@test.com",      phone: "070111069", role: "student" },
  { firstName: "Rovena",     lastName: "Kastrati",  email: "rovena@test.com",   phone: "070111070", role: "student" },
  { firstName: "Skerdi",     lastName: "Dervishi",  email: "skerdi@test.com",   phone: "070111071", role: "student" },
  { firstName: "Trim",       lastName: "Ahmeti",    email: "trim@test.com",       phone: "070111072", role: "student" },
  { firstName: "Urata",      lastName: "Thaqi",     email: "urata@test.com",       phone: "070111073", role: "student" },
  { firstName: "Vlora",      lastName: "Osmani",    email: "vlora@test.com",      phone: "070111074", role: "student" },
  { firstName: "Xhevahire",  lastName: "Zeka",      email: "xhevahire@test.com",    phone: "070111075", role: "student" },
  { firstName: "Zana",       lastName: "Morina",    email: "zana@test.com",       phone: "070111076", role: "student" },
  { firstName: "Argjend",    lastName: "Sadiku",    email: "argjend@test.com",    phone: "070111077", role: "student" },
  { firstName: "Butrint",    lastName: "Bytyqi",    email: "butrint@test.com",    phone: "070111078", role: "student" },
  { firstName: "Doruntina",  lastName: "Rrahmani",  email: "doruntina@test.com",phone: "070111079", role: "student" },
  { firstName: "Erblina",    lastName: "Hajdari",   email: "erblina@test.com",   phone: "070111080", role: "student" },
  { firstName: "Florian",    lastName: "Bala",      email: "florian@test.com",      phone: "070111081", role: "student" },
  { firstName: "Gentiana",   lastName: "Gjoni",     email: "gentiana@test.com",    phone: "070111082", role: "student" },
  { firstName: "Hajredin",   lastName: "Curri",     email: "hajredin@test.com",    phone: "070111083", role: "student" },
  { firstName: "Ilirjana",   lastName: "Maloku",    email: "ilirjana@test.com",   phone: "070111084", role: "student" },
  { firstName: "Jeton",      lastName: "Lleshi",    email: "jeton@test.com",      phone: "070111085", role: "student" },
  { firstName: "Klodian",    lastName: "Rama",      email: "klodian@test.com",      phone: "070111086", role: "student" },
  { firstName: "Lorik",      lastName: "Hoxha",     email: "lorik@test.com",       phone: "070111087", role: "student" },
  { firstName: "Mimoza",     lastName: "Mustafa",   email: "mimoza@test.com",    phone: "070111088", role: "student" },
  { firstName: "Njomza",     lastName: "Behluli",   email: "njomza@test.com",    phone: "070111089", role: "student" },
  { firstName: "Orjeta",     lastName: "Krasniqi",  email: "orjeta@test.com",   phone: "070111090", role: "student" },
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