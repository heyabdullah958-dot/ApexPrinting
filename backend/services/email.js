const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // or configured SMTP
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const OWNER_EMAIL = process.env.OWNER_EMAIL || process.env.EMAIL_USER;

// Basic HTML wrapper for emails
const generateHtml = (content) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 20px; border-top: 4px solid #C9A84C;">
    <h2 style="color: #C9A84C; margin-top: 0;">Apex Printing Solutions</h2>
    <div style="background: #111; padding: 20px; border-radius: 8px;">
      ${content}
    </div>
    <div style="margin-top: 20px; font-size: 12px; color: #888;">
      <p>&copy; ${new Date().getFullYear()} Apex Printing Solutions. All rights reserved.</p>
    </div>
  </div>
`;

async function sendEmail({ to, subject, html, attachments }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials missing, skipping email send:', subject);
    return;
  }
  
  try {
    await transporter.sendMail({
      from: `"Apex Printing Solutions" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: generateHtml(html),
      attachments
    });
  } catch (error) {
    console.error('Email send failed:', error);
  }
}

async function notifyOwnerNewContact(data) {
  const html = `
    <h3 style="color: #fff;">New Contact Inquiry</h3>
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Phone:</strong> ${data.phone || 'N/A'}</p>
    <p><strong>Country:</strong> ${data.country || 'N/A'}</p>
    <p><strong>Service:</strong> ${data.service}</p>
    <p><strong>Message:</strong></p>
    <p style="white-space: pre-wrap; background: #1a1a1a; padding: 10px; border-left: 3px solid #C9A84C;">${data.message}</p>
  `;
  const mailOptions = { to: OWNER_EMAIL, subject: `📨 New Inquiry — ${data.service} from ${data.name}`, html };
  if (data.file) {
    mailOptions.attachments = [{
      filename: data.file.originalname,
      path: data.file.path
    }];
  }
  await sendEmail(mailOptions);
}

async function confirmCustomerContact(data) {
  const html = `
    <h3 style="color: #fff;">Thank You For Reaching Out</h3>
    <p>Dear ${data.name},</p>
    <p>We have received your enquiry regarding <strong>${data.service}</strong>.</p>
    <p><strong>Your Inquiry/Quote Details:</strong></p>
    <p style="white-space: pre-wrap; background: #1a1a1a; padding: 10px; border-left: 3px solid #C9A84C;">${data.message}</p>
    <p>Our team is reviewing your message and will get back to you within 24 business hours.</p>
    <p>Best regards,<br>The Apex Printing Solutions Team</p>
  `;
  await sendEmail({ to: data.email, subject: `We received your message — Apex Printing Solutions`, html });
}

async function notifyOwnerNewQuote(data) {
  const html = `
    <h3 style="color: #fff;">New Quote Request</h3>
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Phone:</strong> ${data.phone || 'N/A'}</p>
    <p><strong>Country:</strong> ${data.country || 'N/A'}</p>
    <p><strong>Service:</strong> ${data.service}</p>
    <p><strong>Quantity:</strong> ${data.quantity || 'N/A'}</p>
    <p><strong>Size:</strong> ${data.size || 'N/A'}</p>
    <p><strong>Paper:</strong> ${data.paper_type || 'N/A'}</p>
    <p><strong>Finishing:</strong> ${data.finishing || 'N/A'}</p>
    <p><strong>Sides:</strong> ${data.sides || 'N/A'}</p>
    <p><strong>Artwork Ready:</strong> ${data.artwork_ready ? 'Yes' : 'No'}</p>
    <p><strong>Notes:</strong></p>
    <p style="white-space: pre-wrap; background: #1a1a1a; padding: 10px; border-left: 3px solid #C9A84C;">${data.notes || 'None'}</p>
  `;
  await sendEmail({ to: OWNER_EMAIL, subject: `📋 Quote Request — ${data.service} from ${data.name}`, html });
}

async function confirmCustomerQuote(data) {
  const html = `
    <h3 style="color: #fff;">Quote Request Received</h3>
    <p>Dear ${data.name},</p>
    <p>We've successfully received your quote request for <strong>${data.quantity || ''} ${data.service}</strong>.</p>
    <p><strong>Quote Details:</strong></p>
    <ul>
      <li><strong>Service:</strong> ${data.service}</li>
      <li><strong>Quantity:</strong> ${data.quantity || 'N/A'}</li>
      <li><strong>Size:</strong> ${data.size || 'N/A'}</li>
      <li><strong>Paper:</strong> ${data.paper_type || 'N/A'}</li>
      <li><strong>Finishing:</strong> ${data.finishing || 'N/A'}</li>
      <li><strong>Sides:</strong> ${data.sides || 'N/A'}</li>
      <li><strong>Artwork Ready:</strong> ${data.artwork_ready ? 'Yes' : 'No'}</li>
    </ul>
    <p><strong>Notes:</strong></p>
    <p style="white-space: pre-wrap; background: #1a1a1a; padding: 10px; border-left: 3px solid #C9A84C;">${data.notes || 'None'}</p>
    <p>Our team is currently reviewing your requirements and will contact you shortly to confirm the final details and pricing.</p>
    <p>Best regards,<br>The Apex Printing Solutions Team</p>
  `;
  await sendEmail({ to: data.email, subject: `Quote Request Received — Apex Printing Solutions`, html });
}

module.exports = {
  notifyOwnerNewContact,
  confirmCustomerContact,
  notifyOwnerNewQuote,
  confirmCustomerQuote
};
