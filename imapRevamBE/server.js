const express = require("express");
const cors = require("cors");
// const initDB = require("./database/dbInit");
const pool = require("./database/db");
const sendIncidentEmail = require("./mailer/email");
const { render } = require("@react-email/render");
const React = require("react");
const EmailTemplate = require("./mailer/emailTemplate"); // import your template
// const getRemainingStatus = require("./utils/getRemainingStatus");
const {
  improveHtmlWithAI,
  generateDashboardInsights,
} = require("./services/aiService");
const router = express.Router();
// const generateHeaderPng = require("./utils/generateHeaderSvg");

const app = express();

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(express.json());
app.use(cors(corsOptions));

app.use("/api/v1/ai", router);

// (async () => {
//   await initDB();
// })();

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
      [newData.incident_number],
    );

    const lastRow = rows.length ? rows[0] : null;

    // 2. Fetch history inside transaction
    const [historyRows] = await pool.query(
      "SELECT * FROM incidents WHERE incident_number = ? ORDER BY id DESC",
      [newData.incident_number],
    );

    // 3. Resolve display_id safely
    const [existingDisplay] = await pool.query(
      "SELECT display_id FROM incidents WHERE incident_number = ? LIMIT 1 FOR UPDATE",
      [newData.incident_number],
    );

    let displayId;

    if (existingDisplay.length && existingDisplay[0].display_id !== null) {
      displayId = existingDisplay[0].display_id;
    } else {
      const [[row]] = await pool.query(
        "SELECT MAX(display_id) AS maxId FROM incidents FOR UPDATE",
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
      const statusChanged = lastRow.incident_status !== newData.incident_status;

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
    incident_subject,
    incident_link,
    performer,
    revenue_impact_details,
    departmentName,
    incident_status,
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
        newData.incident_subject,
        newData.incident_link,
        newData.performer,
        newData.revenue_impact_details,
        newData.departmentName,
        newData.incident_status,
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
      ],
    );

    await pool.query("COMMIT");

    const displayLabel = `INC-${String(displayId).padStart(4, "0")}`;
    // const STATIC_TO = "1st-lvl-shiftleads@taboola.com";

    const safeRemaining =
      typeof newData.remaining_status === "string"
        ? JSON.parse(newData.remaining_status)
        : newData.remaining_status;

    let html = await render(
      React.createElement(EmailTemplate, {
        data: {
          ...newData,
          display_id: displayLabel,
          history: historyRows,
          remainingStatus: safeRemaining,
          showStatus: newData.incident_status,
        },
      }),
    );
    // Inject color-scheme meta tags for dark mode — tells Gmail/Apple Mail to stay in light mode
    html = html.replace(
      "</head>",
      '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>',
    );
    // ,"parassingh964@gmail.com"

    // 🔹 Determine email thread
    let emailThreadId;

    // FIRST EMAIL FOR INCIDENT
    if (!lastRow || !lastRow.email_thread_id) {
      emailThreadId = `<incident-${displayLabel}@taboola.local>`;

      // 🔹 Save thread id in DB
      await pool.query(
        `UPDATE incidents
     SET email_thread_id = ?
     WHERE incident_number = ?`,
        [emailThreadId, newData.incident_number],
      );
      // const revenueTag = newData.revenue_impact ? "[Revenue Impacted] " : "";

      // 🔹 Send FIRST email
      await sendIncidentEmail({
        // to: STATIC_TO,
        // bcc: newData.notification_mails || []
        bcc: "taboolaimaptest@gmail.com",
        subject: `[Incident ${displayLabel}]: ${newData.incident_subject}`,
        html,
        messageId: emailThreadId, // 🔥 ROOT MESSAGE
      });
    }

    // FOLLOW-UP EMAIL
    else {
      emailThreadId = lastRow.email_thread_id;
      // const revenueTag = newData.revenue_impact ? "[Revenue Impacted] " : "";

      await sendIncidentEmail({
        // to: STATIC_TO,
        // bcc: newData.notification_mails || [],
        bcc: "taboolaimaptest@gmail.com",
        subject: `Re: [Incident ${displayLabel}]: ${newData.incident_subject}`,
        html,
        inReplyTo: emailThreadId,
        references: emailThreadId,
      });
    }

    res.json({ success: true, id: result.insertId, display_id: displayId });
  } catch (err) {
    if (transactionStarted) {
      await pool.query("ROLLBACK");
    }
    console.error("❌ Error inserting incident:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// -------- RECIPIENTS PAGE (linked from email) --------
app.get("/api/v1/incidents/:incident_number/recipients", async (req, res) => {
  try {
    let { incident_number } = req.params;
    incident_number = incident_number.trim();

    let rows = [];

    // Support INC-0001 format
    if (/^INC-\d+$/i.test(incident_number)) {
      const displayId = parseInt(incident_number.replace(/INC-/i, ""), 10);
      [rows] = await pool.query(
        "SELECT notification_mails, incident_subject, incident_status, display_id FROM incidents WHERE display_id = ? ORDER BY id DESC LIMIT 1",
        [displayId],
      );
    } else {
      [rows] = await pool.query(
        "SELECT notification_mails, incident_subject, incident_status, display_id FROM incidents WHERE incident_number = ? ORDER BY id DESC LIMIT 1",
        [incident_number],
      );
    }

    if (!rows.length) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const row = rows[0];
    let recipients = [];
    try {
      recipients =
        typeof row.notification_mails === "string"
          ? JSON.parse(row.notification_mails)
          : row.notification_mails || [];
    } catch (e) {
      recipients = [];
    }

    res.json({
      display_id: `INC-${String(row.display_id).padStart(4, "0")}`,
      incident_subject: row.incident_subject,
      incident_status: row.incident_status,
      recipients,
    });
  } catch (err) {
    console.error("❌ Error fetching recipients:", err);
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
        [searchByIncident],
      );
    } else if (searchByDisplay !== null) {
      [rows] = await pool.query(
        "SELECT * FROM incidents WHERE display_id = ? ORDER BY id DESC",
        [searchByDisplay],
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

router.post("/dashboard-insights", async (req, res) => {
  try {
    const { snapshot } = req.body;
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      return res.status(400).json({ error: "snapshot object required" });
    }
    const insights = await generateDashboardInsights(snapshot);
    res.json({ insights });
  } catch (err) {
    if (err.code === "AI_NOT_CONFIGURED") {
      return res.status(503).json({
        error: "AI not configured",
        code: "AI_NOT_CONFIGURED",
        insights: null,
      });
    }
    console.error("❌ AI dashboard-insights error:", err);
    res.status(500).json({ error: "AI processing failed", insights: null });
  }
});

app.post("/api/v1/incidents/department-change-email", async (req, res) => {
  // const STATIC_TO = "1st-lvl-shiftleads@taboola.com";
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
      [incidentNumber],
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

    const FONT = '"Poppins", Arial, sans-serif';

    const sanitizeHtml = (input) => {
      if (!input) return "";
      return String(input)
        .replace(/<p>/gi, '<div style="margin:0 0 8px 0;">')
        .replace(/<\/p>/gi, "</div>")
        .replace(/<strong>/gi, '<strong style="font-weight:600;">');
    };

    // 🔹 Fetch thread id
    const [[threadRow]] = await pool.query(
      `SELECT email_thread_id, display_id, incident_subject
       FROM incidents
       WHERE incident_number = ?
       ORDER BY id ASC
       LIMIT 1`,
      [incidentNumber],
    );

    const displayLabel = `INC-${String(threadRow.display_id).padStart(4, "0")}`;

    if (!threadRow?.email_thread_id) {
      throw new Error("Email thread not found for incident");
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;-webkit-text-size-adjust:100%;mso-line-height-rule:exactly;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F3F4F6;padding:32px 16px;">
  <tr><td align="center">

    <!-- ── CARD ── -->
    <table width="650" cellpadding="0" cellspacing="0" border="0" style="max-width:650px;width:100%;background-color:#ffffff;border:1px solid #E5E7EB;font-family:Arial,sans-serif;">
      <tr>

        <!-- ── HEADER ── -->
        <!-- Note: gradient is a best-effort; mso fallback is dark blue -->
        <td style="background-color:#1E3A8A;background-image:linear-gradient(135deg,#1E3A8A 0%,#3B82F6 100%);padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <!-- Title block -->
              <td width="70%" valign="top" style="padding:28px 0 28px 36px;">
                <p style="margin:0;font-size:21px;font-weight:bold;color:#ffffff;font-family:Arial,sans-serif;letter-spacing:-0.3px;line-height:1.2;">
                  Department Change Notice
                </p>
                <p style="margin:6px 0 0 0;font-size:12px;color:#BFDBFE;font-family:Arial,sans-serif;line-height:1.4;">
                  Incident Management &nbsp;&middot;&nbsp; Taboola
                </p>
              </td>
              <!-- Badge -->
              <td width="30%" valign="top" align="right" style="padding:28px 36px 28px 0;">
                <table cellpadding="0" cellspacing="0" border="0" align="right">
                  <tr>
                    <td style="background-color:#2563EB;border:1px solid #93C5FD;border-radius:6px;padding:6px 14px;">
                      <span style="font-size:11px;font-weight:bold;color:#ffffff;font-family:Arial,sans-serif;letter-spacing:0.8px;text-transform:uppercase;white-space:nowrap;">
                        Dept. Transfer
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>

      </tr>

      <!-- ── INCIDENT META STRIP ── -->
      <tr>
        <td style="background-color:#F8FAFC;border-bottom:1px solid #E5E7EB;padding:13px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size:11px;font-weight:bold;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">
                Incident
              </td>
              <td align="right">
                <span style="font-size:13px;font-weight:bold;color:#111827;font-family:Arial,sans-serif;">${displayLabel}</span>
                <span style="font-size:13px;color:#9CA3AF;font-family:Arial,sans-serif;">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
                <span style="font-size:13px;color:#6B7280;font-family:Arial,sans-serif;">${threadRow.incident_subject || incidentNumber}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ── DEPARTMENT TRANSFER SECTION ── -->
      <tr>
        <td style="padding:28px 36px 8px 36px;">
          <p style="margin:0 0 16px 0;font-size:11px;font-weight:bold;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">
            Department Transfer
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>

              <!-- FROM card -->
              <td width="44%" valign="middle" style="background-color:#FFFBEB;border:2px solid #FCD34D;border-radius:10px;padding:16px 12px;text-align:center;">
                <p style="margin:0 0 6px 0;font-size:10px;font-weight:bold;color:#92400E;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">
                  From
                </p>
                <p style="margin:0;font-size:17px;font-weight:bold;color:#B45309;font-family:Arial,sans-serif;">
                  ${fromDepartment}
                </p>
              </td>

              <!-- ARROW -->
              <td width="12%" valign="middle" align="center" style="padding:0 6px;">
                <table cellpadding="0" cellspacing="0" border="0" align="center">
                  <tr>
                    <td width="38" height="38" align="center" valign="middle" style="background-color:#EFF6FF;border:2px solid #BFDBFE;border-radius:50%;width:38px;height:38px;">
                      <span style="font-size:18px;color:#2563EB;font-family:Arial,sans-serif;line-height:1;">&#8594;</span>
                    </td>
                  </tr>
                </table>
              </td>

              <!-- TO card -->
              <td width="44%" valign="middle" style="background-color:#EFF6FF;border:2px solid #93C5FD;border-radius:10px;padding:16px 12px;text-align:center;">
                <p style="margin:0 0 6px 0;font-size:10px;font-weight:bold;color:#1E40AF;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">
                  To
                </p>
                <p style="margin:0;font-size:17px;font-weight:bold;color:#1D4ED8;font-family:Arial,sans-serif;">
                  ${toDepartment}
                </p>
              </td>

            </tr>
          </table>
        </td>
      </tr>

      <!-- ── MESSAGE BODY ── -->
      ${
        messageHtml
          ? `
      <tr>
        <td style="padding:24px 36px 8px 36px;">
          <p style="margin:0 0 10px 0;font-size:11px;font-weight:bold;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">
            Message from the Incident Owner
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="3" style="background-color:#2563EB;border-radius:3px;">&nbsp;</td>
              <td style="background-color:#F8FAFC;padding:14px 18px;font-size:14px;color:#374151;line-height:1.7;font-family:Arial,sans-serif;">
                ${sanitizeHtml(messageHtml)}
              </td>
            </tr>
          </table>
        </td>
      </tr>`
          : `
      <tr>
        <td style="padding:24px 36px 8px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background-color:#F8FAFC;border:1px dashed #D1D5DB;border-radius:8px;padding:14px 18px;font-size:13px;color:#9CA3AF;text-align:center;font-family:Arial,sans-serif;">
                No additional message was provided.
              </td>
            </tr>
          </table>
        </td>
      </tr>`
      }

      <!-- ── INFO NOTE (table-based, no flex) ── -->
      <tr>
        <td style="padding:20px 36px 28px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background-color:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:12px 16px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="22" valign="top" style="font-size:14px;color:#92400E;font-family:Arial,sans-serif;padding-right:8px;">
                      &#9888;
                    </td>
                    <td style="font-size:12px;color:#92400E;line-height:1.6;font-family:Arial,sans-serif;">
                      This incident has been reassigned. Please ensure your team is aware of the ownership change and update any internal tracking accordingly.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ── FOOTER ACCENT LINE ── -->
      <tr>
        <td height="2" style="background-color:#2563EB;background-image:linear-gradient(90deg,#1E3A8A,#3B82F6);font-size:0;line-height:0;">&nbsp;</td>
      </tr>

      <!-- ── FOOTER BODY ── -->
      <tr>
        <td style="background-color:#F9FAFB;padding:18px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="middle">
                <p style="margin:0;font-size:13px;font-weight:bold;color:#111827;font-family:Arial,sans-serif;">Taboola Incident Management</p>
                <p style="margin:3px 0 0 0;font-size:11px;color:#9CA3AF;font-family:Arial,sans-serif;">IncidentManagement@taboola.com</p>
              </td>
              <td valign="middle" align="right">
                <p style="margin:0;font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">Salesforce Case ID</p>
                <p style="margin:3px 0 0 0;font-size:13px;font-weight:bold;color:#111827;font-family:Arial,sans-serif;">${incidentNumber}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ── DISCLAIMER ── -->
      <tr>
        <td style="background-color:#F3F4F6;padding:12px 36px;text-align:center;">
          <p style="margin:0;font-size:10px;color:#9CA3AF;font-family:Arial,sans-serif;">
            This is an automated notification from Taboola Incident Management Platform
          </p>
        </td>
      </tr>

    </table>
    <!-- end card -->

  </td></tr>
</table>
</body>
</html>`;

    if (!oldNotificationMails || oldNotificationMails.length === 0) {
      return res.status(400).json({
        error: "No previous notification emails found",
      });
    }

    await sendIncidentEmail({
      // to: STATIC_TO,
      // bcc: oldNotificationMails,
      bcc: "taboolaimaptest@gmail.com",
      subject: `Re: [Incident ${displayLabel}]: ${threadRow.incident_subject}`,
      html,
      inReplyTo: threadRow.email_thread_id,
      references: threadRow.email_thread_id,
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

// ---------------- SALESFORCE / WORKATO ----------------
app.post("/api/v1/salesforce/create-case", async (req, res) => {
  const token = process.env.WORKATO_API_TOKEN;
  if (!token) {
    return res
      .status(503)
      .json({ error: "WORKATO_API_TOKEN is not configured on the server" });
  }

  try {
    const upstream = await fetch(
      "https://apim.workato.com/taboola/salesforce-v1/upsert_case",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "API-TOKEN": token,
        },
        body: JSON.stringify(req.body),
      }
    );

    const text = await upstream.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { raw: text };
    }

    if (!upstream.ok) {
      console.error("❌ Workato error:", upstream.status, result);
      return res
        .status(upstream.status)
        .json({ error: "Workato request failed", details: result });
    }

    // Workato returns { status: "Created", sf_case_id: "..." }
    const sf_case_id = result.sf_case_id || result.id || result.Id || result.case_id;
    const sf_case_url = sf_case_id
      ? `https://taboola.lightning.force.com/lightning/r/Case/${sf_case_id}/view`
      : null;

    res.json({ ...result, sf_case_id, sf_case_url });
  } catch (err) {
    console.error("❌ Salesforce case creation error:", err);
    res
      .status(500)
      .json({ error: "Failed to create Salesforce case", details: err.message });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
