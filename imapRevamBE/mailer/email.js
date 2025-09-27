const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendIncidentEmail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"Incidents" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return info;
  } catch (err) {
    console.error("❌ Error sending email:", err);
    throw err;
  }
}
module.exports = sendIncidentEmail;
