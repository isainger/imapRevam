/**
 * Default (CI / prod): TLS when DB_SSL_CA is set (e.g. k8s-mounted CA); otherwise ssl off.
 * Optional override: copy db.local.example.js → db.local.js (gitignored) for custom dev pools.
 */
const path = require("path");
const fs = require("fs");

const localPath = path.join(__dirname, "db.local.js");
if (fs.existsSync(localPath)) {
  module.exports = require(localPath);
} else {
  const mysql = require("mysql2/promise");
  const dotenv = require("dotenv");

  dotenv.config();

  const ssl =
    process.env.DB_SSL_CA && String(process.env.DB_SSL_CA).trim() !== ""
      ? { ca: fs.readFileSync(process.env.DB_SSL_CA) }
      : false;

  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
    ssl,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "Z",
    dateStrings: false,
  });

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
}
