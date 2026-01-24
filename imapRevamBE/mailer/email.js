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

async function sendIncidentEmail({
  to,
  subject,
  html,
  messageId,     // ONLY for first email
  inReplyTo,     // ONLY for follow-ups
  references,    // ONLY for follow-ups
}) {
  const mailOptions = {
    from: `"Incidents" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  };

  // FIRST EMAIL → owns the thread
  if (messageId) {
    mailOptions.messageId = messageId;
  }

  // FOLLOW-UP EMAILS → reply to thread
  if (inReplyTo) {
    mailOptions.inReplyTo = inReplyTo;
    mailOptions.references = references || inReplyTo;
  }

  const info = await transporter.sendMail(mailOptions);
  return info;
}


module.exports = sendIncidentEmail;
