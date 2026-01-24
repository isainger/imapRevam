const pool = require("./db"); // now pool, not db

async function initDB() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS incidents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      display_id INT,
      email_thread_id VARCHAR(255),
      known_issue VARCHAR(10),
      incident_number VARCHAR(100) NOT NULL,
      subject VARCHAR(1000) NOT NULL,
      incident_link TEXT NOT NULL,
      performer VARCHAR(255) NOT NULL,
      revenue_impact_details VARCHAR(1000),
      departmentName VARCHAR(50),
      status VARCHAR(50),
      remaining_status JSON,
      incident_type VARCHAR(50),
      revenue_impact VARCHAR(10),
      reported_by VARCHAR(50),
      severity VARCHAR(50),
      affected_product VARCHAR(500),
      region_impacted VARCHAR(50),
      service_impacted VARCHAR(100),
      notification_mails JSON,
      start_time TIMESTAMP NULL DEFAULT NULL,
      resolved_time TIMESTAMP NULL DEFAULT NULL,
      resolved_with_rca_time TIMESTAMP NULL DEFAULT NULL,
      discovered_time TIMESTAMP NULL DEFAULT NULL,
      next_update VARCHAR(10),
      next_update_time TIMESTAMP NULL DEFAULT NULL,
      incident_details TEXT,
      status_update_details TEXT,
      workaround VARCHAR(10),
      workaround_details TEXT,
      resolved_details TEXT,
      resolved_with_rca_details TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by INT NULL,
      updated_by INT NULL,
      KEY idx_incident_number (incident_number),
      KEY idx_display_id (display_id)
    ) ENGINE=InnoDB;
  `;

  try {
    await pool.query(createTableQuery);
    console.log("✅ Incidents table ready!");
  } catch (err) {
    console.error("❌ Error creating incidents table:", err);
  }
}

module.exports = initDB;
