import pool from './config/database.js';

console.log("Starting database test...");

async function testDatabase() {
  try {
    console.log("Connecting...");

    const result = await pool.query("SELECT NOW()");

    console.log("Connected successfully!");
    console.log(result.rows);
  } catch (err) {
    console.error("Connection error:");
    console.error(err);
  } finally {
    console.log("Closing connection...");
    await pool.end();
    process.exit(0);
  }
}

testDatabase();