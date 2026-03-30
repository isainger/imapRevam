const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: 'ildcsmtp.office.taboola.com',
  port: 25,
  secure: false,
  auth: {
      user: 'smtp_user',
  },
});

async function sendIncidentEmail({
  to,
  bcc,
  subject,
  html,
  messageId,     // ONLY for first email
  inReplyTo,     // ONLY for follow-ups
  references,    // ONLY for follow-ups
}) {
  const mailOptions = {
    from: 'Incident Management <IncidentManagement@taboola.com>',
    to,
    subject,
    html,
  };
  if (bcc && bcc.length) {
    mailOptions.bcc = bcc;
  }
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
