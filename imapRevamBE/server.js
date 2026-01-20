const express = require("express");
const cors = require("cors");
const initDB = require("./database/dbInit");
const pool = require("./database/db");
const sendIncidentEmail = require("./mailer/email");
const { render } = require("@react-email/render");
const React = require("react");
const EmailTemplate = require("./mailer/emailTemplate"); // import your template
const getRemainingStatus = require("./utils/getRemainingStatus");
const { improveHtmlWithAI } = require("./services/aiService");
const router = express.Router();
// const generateHeaderPng = require("./utils/generateHeaderSvg");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/v1/ai", router);

(async () => {
  await initDB();
})();
// ------- API---------------
app.post("/api/v1/incidents", async (req, res) => {
  const newData = req.body;
  let transactionStarted = false;

  try {
    await pool.query("START TRANSACTION");
    transactionStarted = true;

    // 1. Fetch latest incident row (LOCKED)
    const [rows] = await pool.query(
      "SELECT * FROM incidents WHERE incident_number = ? ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [newData.incident_number]
    );

    const lastRow = rows.length ? rows[0] : null;

    // 2. Fetch history inside transaction
    const [historyRows] = await pool.query(
      "SELECT * FROM incidents WHERE incident_number = ? ORDER BY id DESC",
      [newData.incident_number]
    );

    // 3. Resolve display_id safely
    const [existingDisplay] = await pool.query(
      "SELECT display_id FROM incidents WHERE incident_number = ? LIMIT 1 FOR UPDATE",
      [newData.incident_number]
    );

    let displayId;

    if (existingDisplay.length && existingDisplay[0].display_id !== null) {
      displayId = existingDisplay[0].display_id;
    } else {
      const [[row]] = await pool.query(
        "SELECT MAX(display_id) AS maxId FROM incidents FOR UPDATE"
      );
      displayId = (row.maxId || 0) + 1;
    }

    // 4. created_at / updated_at logic
    let created_at = new Date();
    let updated_at = new Date();

    if (!lastRow) {
      // first ever insert
      created_at = new Date();
      updated_at = new Date();
    } else {
      const statusChanged = lastRow.status !== newData.status;

      if (statusChanged) {
        // status changed → reset lifecycle
        created_at = new Date();
        updated_at = lastRow.updated_at;
      } else {
        // normal update
        created_at = lastRow.created_at;
        updated_at = new Date();
      }
    }

    // 5. Insert
    const [result] = await pool.query(
      `
  INSERT INTO incidents (
    display_id,
    known_issue,
    incident_number,
    subject,
    incident_link,
    performer,
    revenue_impact_details,
    departmentName,
    status,
    remaining_status,
    incident_type,
    revenue_impact,
    reported_by,
    severity,
    affected_product,
    region_impacted,
    service_impacted,
    notification_mails,
    start_time,
    resolved_time,
    resolved_with_rca_time,
    discovered_time,
    next_update,
    next_update_time,
    incident_details,
    status_update_details,
    workaround,
    workaround_details,
    resolved_details,
    resolved_with_rca_details,
    created_at,
    updated_at
  )
  VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
  `,
      [
        displayId,
        newData.known_issue,
        newData.incident_number,
        newData.subject,
        newData.incident_link,
        newData.performer,
        newData.revenue_impact_details,
        newData.departmentName,
        newData.status,
        newData.remaining_status,
        newData.incident_type,
        newData.revenue_impact,
        newData.reported_by,
        newData.severity,
        newData.affected_product,
        newData.region_impacted,
        newData.service_impacted,
        JSON.stringify(newData.notification_mails || []),
        newData.start_time,
        newData.resolved_time,
        newData.resolved_with_rca_time,
        newData.discovered_time,
        newData.next_update,
        newData.next_update_time,
        newData.incident_details,
        newData.status_update_details,
        newData.workaround,
        newData.workaround_details,
        newData.resolved_details,
        newData.resolved_with_rca_details,
        created_at,
        updated_at,
      ]
    );

    await pool.query("COMMIT");

    const displayLabel = `INC-${String(displayId).padStart(4, "0")}`;

    const safeRemaining =
      typeof newData.remaining_status === "string"
        ? JSON.parse(newData.remaining_status)
        : newData.remaining_status;

    const html = await render(
      React.createElement(EmailTemplate, {
        data: {
          ...newData,
          display_id: displayLabel,
          history: historyRows,
          remainingStatus: safeRemaining,
          showStatus: newData.status,
        },
      })
    );
    // ,"parassingh964@gmail.com"

    await sendIncidentEmail({
      to: "taboolaimaptest@gmail.com",
      subject: `[Internal Notification] ${newData.status}: ${
        newData.revenue_impact ? "[Revenue Impacted]" : ""
      } ${newData.subject}`,
      html,
    });

    res.json({ success: true, id: result.insertId, display_id: displayId });
  } catch (err) {
    if (transactionStarted) {
      await pool.query("ROLLBACK");
    }
    console.error("❌ Error inserting incident:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/v1/incidents/:incident_number", async (req, res) => {
  try {
    let { incident_number } = req.params;

    // 1️⃣ Normalize input
    incident_number = incident_number.trim();

    let searchByIncident = null;
    let searchByDisplay = null;

    // Case 1: Salesforce URL
    const urlMatch = incident_number.match(/\/Case\/([a-zA-Z0-9]+)\//);
    if (urlMatch) {
      searchByIncident = urlMatch[1];
    }

    // Case 2: INC-000123
    else if (/^INC-\d+$/i.test(incident_number)) {
      searchByDisplay = parseInt(incident_number.replace(/INC-/i, ""), 10);
    }

    // Case 3: only number → display_id
    else if (/^\d+$/.test(incident_number)) {
      searchByDisplay = Number(incident_number);
    }

    // Case 4: fallback → assume raw incident_number
    else {
      searchByIncident = incident_number;
    }
    let rows = [];
    if (searchByIncident) {
      [rows] = await pool.query(
        "SELECT * FROM incidents WHERE incident_number = ? ORDER BY id DESC",
        [searchByIncident]
      );
    } else if (searchByDisplay !== null) {
      [rows] = await pool.query(
        "SELECT * FROM incidents WHERE display_id = ? ORDER BY id DESC",
        [searchByDisplay]
      );
    }

    // ✅ IMPORTANT: explicitly handle "not found"
    if (!rows || rows.length === 0) {
      return res.status(200).json([]);
    }

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching incident:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/v1/incidents", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM incidents");
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching incident:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------------- AI ROUTE ----------------
router.post("/improve", async (req, res) => {
  try {
    const { html, context } = req.body;

    if (!html || !context) {
      return res.status(400).json({ error: "html and context are required" });
    }

    const improvedHtml = await improveHtmlWithAI(html, context);
    res.json({ html: improvedHtml });
  } catch (err) {
    console.error("❌ AI improve error:", err);
    res.status(500).json({ error: "AI processing failed" });
  }
});

app.post("/api/v1/incidents/department-change-email", async (req, res) => {
  try {
    const { incidentNumber, fromDepartment, toDepartment, messageHtml } =
      req.body;

    if (!incidentNumber || !fromDepartment || !toDepartment) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🔥 FETCH LAST SAVED INCIDENT
    const [rows] = await pool.query(
      `SELECT notification_mails
       FROM incidents
       WHERE incident_number = ?
       ORDER BY id DESC
       LIMIT 1`,
      [incidentNumber]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Incident not found" });
    }

    // ✅ USE OLD EMAIL LIST
    let oldNotificationMails = [];

    try {
      oldNotificationMails = rows[0].notification_mails
        ? typeof rows[0].notification_mails === "string"
          ? JSON.parse(rows[0].notification_mails)
          : rows[0].notification_mails
        : [];
    } catch (e) {
      console.error("❌ Failed to parse notification_mails", e);
      oldNotificationMails = [];
    }

    const html = `
      <p><strong>Incident:</strong> ${incidentNumber}</p>
      <p>
        <strong>Department Change:</strong>
        ${fromDepartment} → ${toDepartment}
      </p>
      <hr />
      ${messageHtml || "<p>No additional message provided.</p>"}
    `;

    if (!oldNotificationMails || oldNotificationMails.length === 0) {
      return res.status(400).json({
        error: "No previous notification emails found",
      });
    }
    await sendIncidentEmail({
      to: /*oldNotificationMails*/ "taboolaimaptest@gmail.com", // ✅ LAST SAVED
      subject: `[Department Change] ${incidentNumber}`,
      html,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      error: "Email failed",
      details: err.message,
    });
  }
});

// app.get("/email/header", async (req, res) => {
//   try {
//     const { id, status } = req.query;

//     const buffer = await generateHeaderPng({
//       title: "Incident Notification",
//       incidentId: id || "UNKNOWN",
//       status: status || "unknown",
//     });

//     res.setHeader("Content-Type", "image/png");
//     res.setHeader("Cache-Control", "public, max-age=3600");
//     res.end(buffer);
//   } catch (err) {
//     console.error("Header render error:", err);
//     res.status(500).send("Image generation failed");
//   }
// });

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
