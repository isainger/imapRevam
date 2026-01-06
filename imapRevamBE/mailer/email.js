const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendIncidentEmail({ to, subject, html }) {
  try {
    // generate unique message id (prevents email threading)
    const messageId = `<incident-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}@taboola.local>`;

    const info = await transporter.sendMail({
      from: `"Incidents" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,

      headers: {
        "Message-ID": messageId,
        "X-Entity-Ref-ID": messageId,
      },
    });

    return info;
  } catch (err) {
    console.error("❌ Error sending email:", err);
    throw err;
  }
}

module.exports = sendIncidentEmail;
