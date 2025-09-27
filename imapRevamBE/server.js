const express = require("express");
const cors = require("cors");
const initDB = require("./database/dbInit");
const pool = require("./database/db");
const sendIncidentEmail = require("./mailer/email");
const { render } = require('@react-email/render');
const React = require('react');
const EmailTemplate = require("./mailer/emailTemplate"); // import your template
const getRemainingStatus = require("./utils/getRemainingStatus");

const app = express();
app.use(cors());
app.use(express.json());

(async () => {
  await initDB();
})();
// ------- API---------------
app.post("/api/v1/incidents", async (req, res) => {
  const newData = req.body;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM incidents WHERE incident_number = ? ORDER BY id DESC LIMIT 1",
      [newData.incident_number]
    );
    const lastRow=rows.length > 0 ? rows[0] :null

    const remainingStatus=getRemainingStatus(lastRow,newData.remaining_status)

    let created_at = new Date();
    let updated_at = new Date();
    
    if (lastRow) {
      const { status, ...rest } = newData;
      const { status: oldStatus, ...oldRest } = lastRow;

      if (
        status !== oldStatus &&
        JSON.stringify(rest) === JSON.stringify(oldRest)
      ) {
        created_at = new Date(); // refresh created_at
        updated_at = lastRow.updated_at;
      } else {
        created_at = lastRow.created_at; // keep old created_at
        updated_at = new Date(); // refresh updated_at
      }
    }

    // 2. Insert new row
    const [result] = await pool.query(
      `INSERT INTO incidents 
       (incident_number,known_issue, subject, incident_link, performer, revenue_impact_details,
        departmentName, status, remaining_status, incident_type, revenue_impact, next_update,
         workaround, reported_by,severity, affected_product, region_impacted, service_impacted,
        notification_mails, start_time, discovered_time, next_update_time,
        incident_details, status_update_details, workaround_details, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newData.incident_number,
        newData.known_issue,
        newData.subject,
        newData.incident_link,
        newData.performer,
        newData.revenue_impact_details,
        newData.departmentName,
        newData.status,
        remainingStatus,
        newData.incident_type,
        newData.revenue_impact,
        newData.next_update,
        newData.workaround,
        newData.reported_by,
        newData.severity,
        newData.affected_product,
        newData.region_impacted,
        newData.service_impacted,
        JSON.stringify(newData.notification_mails || []),
        newData.start_time,
        newData.discovered_time,
        newData.next_update_time,
        newData.incident_details,
        newData.status_update_details,
        newData.workaround_details,
        created_at,
        updated_at,
      ]
    );

    const templateData = {
      ...newData,
      radio: {
        status: newData.status,
        remainingStatus: JSON.parse(remainingStatus),
      }
    };
    const html = await render(React.createElement(EmailTemplate, { data: templateData }));
    
    await sendIncidentEmail({
      to: "taboolaimaptest@gmail.com",
      subject: `Test Incident: ${newData.incident_number}`,
      html:html,
    });
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("❌ Error inserting incident:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/v1/incidents/:incident_number", async (req, res) => {
  try {
    const { incident_number } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM incidents WHERE incident_number = ? ORDER BY id DESC",
      [incident_number]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching incident:", err);
    res.status(500).json({ error: "Database error" });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
