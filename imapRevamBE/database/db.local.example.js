/**
 * Local-only database pool (not committed).
 * 1. Copy this file to: database/db.local.js
 * 2. Edit paths / ssl below for your laptop.
 * 3. Keep db.local.js out of git — it is listed in .gitignore.
 *
 * When db.local.js exists, database/db.js loads it instead of the prod pool.
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

// Prefer env; else PEM next to backend package.json (imapRevamBE/cert.pem)
const certPath =
  process.env.DB_SSL_CA || path.join(__dirname, "..", "cert.pem");
const sslCA = fs.readFileSync(certPath);

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
  ssl: { ca: sslCA },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
  dateStrings: false,
});

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Connected to MySQL/TiDB (db.local.js)");
    conn.release();
  } catch (err) {
    console.error("❌ DB connection failed:", err);
  }
})();

module.exports = pool;
