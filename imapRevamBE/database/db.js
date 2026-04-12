/**
 * Committed behaviour = production: pool with ssl: false (what works in prod).
 * For a different local setup (e.g. cert file), copy db.local.example.js to
 * db.local.js in this folder — that file is gitignored and never goes to Tabbucket.
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

  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
    ssl: false,
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
