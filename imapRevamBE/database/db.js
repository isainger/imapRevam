const mysql = require("mysql2/promise");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();

const sslCA = fs.readFileSync("./cert.pem");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "test",
  ssl: { ca: sslCA },
  waitForConnections: true,
  connectionLimit: 10, // max simultaneous connections
  queueLimit: 0,
  timezone: "Z", // force DB driver to interpret everything as UTC
  dateStrings: false, // keep results as JS Date objects, not raw strings       // unlimited queued requests
});

// ✅ Test once on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Connected to MySQL/TiDB");
    conn.release(); // release connection back to pool
  } catch (err) {
    console.error("❌ DB connection failed:", err);
  }
})();

module.exports = pool;
