const mysql = require("mysql2/promise");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL_CA
    ? { ca: fs.readFileSync(process.env.DB_SSL_CA) }
    : false,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
  dateStrings: false,
});

// ✅ Test once on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Connected to MySQL/TiDB");
    conn.release();
  } catch (err) {
    console.error("❌ DB connection failed:", err);
  }
})();

module.exports = pool;
