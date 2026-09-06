const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000
});

const DEFAULT_COMPANY_EMAIL = 'quotes@apexprinthub.com';
const EMAIL_FROM = process.env.EMAIL_FROM || DEFAULT_COMPANY_EMAIL;
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || DEFAULT_COMPANY_EMAIL;
const OWNER_EMAIL = process.env.OWNER_EMAIL || DEFAULT_COMPANY_EMAIL;

// Responsive luxury HTML wrapper matching Apex Print Hub branding
const generateHtml = (title, content, preheader = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0d0d; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  ${preheader ? `<div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #0d0d0d;">${preheader}</div>` : ''}
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #0d0d0d; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #141414; border: 1px solid #262626; border-top: 4px solid #C9A84C; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 30px; text-align: center; background-color: #111111; border-bottom: 1px solid #222222;">
              <h1 style="margin: 0; font-size: 24px; letter-spacing: 3px; color: #C9A84C; text-transform: uppercase; font-weight: 700;">APEX</h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: 4px; color: #888888; text-transform: uppercase;">PRINT HUB &middot; BESPOKE PRINTING</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 35px 30px; color: #E0E0E0; font-size: 15px; line-height: 1.6;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; background-color: #0f0f0f; border-top: 1px solid #222222; text-align: center; color: #777777; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0 0 6px 0; color: #C9A84C; font-weight: 600;">Apex Print Hub</p>
              <p style="margin: 0 0 10px 0;">Premium Commercial Printing & Custom Packaging</p>
              <p style="margin: 0; font-size: 11px; color: #555555;">&copy; ${new Date().getFullYear()} Apex Print Hub. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

async function sendEmail({ to, subject, html, preheader, attachments, from, replyTo }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials missing from environment, skipping send for:', subject);
    return false;
  }
  
  try {
    const senderAddress = from || `"Apex Print Hub" <${EMAIL_FROM}>`;
    const replyAddress = replyTo || EMAIL_REPLY_TO;

    const info = await transporter.sendMail({
      from: senderAddress,
      to,
      replyTo: replyAddress,
      subject,
      html: generateHtml(subject, html, preheader),
      attachments
    });
    console.log(`✉️ Email successfully dispatched to ${to} (From: ${senderAddress}, Reply-To: ${replyAddress}, MessageID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`❌ Email send failed to ${to}:`, error.message);
    return false;
  }
}

// 1. Notify Owner / Admin about New Order Inquiry or Contact
async function notifyOwnerNewContact(data) {
  const files = data.files || (data.file ? [data.file] : []);

  let cloudLinksHtml = '';
  if (data.cartData && Array.isArray(data.cartData)) {
    const cloudItems = data.cartData.filter(it => it && it.design && it.design.url && (it.design.url.startsWith('http://') || it.design.url.startsWith('https://')));
    if (cloudItems.length > 0) {
      cloudLinksHtml = `
    <div style="background-color: #1a1a1a; border: 1px solid #C9A84C; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
      <h4 style="margin: 0 0 12px 0; color: #C9A84C; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
        ☁️ Cloud-Hosted High-Resolution Print Artwork:
      </h4>
      <table width="100%" style="font-size: 13px; color: #CCCCCC; border-collapse: collapse;">
        ${cloudItems.map(it => {
          const sizeMB = typeof it.design.size === 'number' ? (it.design.size / (1024 * 1024)).toFixed(2) : '0.00';
          return `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #262626;"><strong style="color: #FFFFFF;">${it.title || 'Product'}:</strong> ${it.design.name || 'artwork'} <span style="color: #888888;">(${sizeMB} MB)</span></td>
            <td align="right" style="padding: 8px 0; border-bottom: 1px solid #262626;">
              <a href="${it.design.url}" target="_blank" style="background-color: #C9A84C; color: #000000; padding: 6px 14px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 12px; display: inline-block;">Download File ↗</a>
            </td>
          </tr>
          `;
        }).join('')}
      </table>
    </div>`;
    }
  }

  const html = `
    <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid #2a2a2a; padding-bottom: 12px;">
      🔔 New Order Inquiry Received
    </h2>
    <div style="background-color: #1a1a1a; border: 1px solid #2e2e2e; border-radius: 6px; padding: 18px; margin-bottom: 20px;">
      <table width="100%" style="font-size: 14px; color: #CCCCCC;">
        <tr><td width="30%" style="padding: 6px 0; color: #888888;"><strong>Client Name:</strong></td><td style="padding: 6px 0; color: #FFFFFF; font-weight: bold;">${data.name}</td></tr>
        <tr><td style="padding: 6px 0; color: #888888;"><strong>Email:</strong></td><td style="padding: 6px 0;"><a href="mailto:${data.email}" style="color: #C9A84C; text-decoration: none;">${data.email}</a></td></tr>
        <tr><td style="padding: 6px 0; color: #888888;"><strong>Phone:</strong></td><td style="padding: 6px 0; color: #FFFFFF;">${data.phone || 'Not provided'}</td></tr>
        <tr><td style="padding: 6px 0; color: #888888;"><strong>Region:</strong></td><td style="padding: 6px 0; color: #FFFFFF;">${data.country || 'N/A'}</td></tr>
        <tr><td style="padding: 6px 0; color: #888888;"><strong>Service:</strong></td><td style="padding: 6px 0; color: #C9A84C; font-weight: bold;">${data.service}</td></tr>
      </table>
    </div>
    ${cloudLinksHtml}
    <div style="margin-bottom: 20px;">
      <h3 style="color: #C9A84C; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Order / Project Specifications:</h3>
      <div style="white-space: pre-wrap; background-color: #1a1a1a; padding: 15px; border-left: 3px solid #C9A84C; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 13px; color: #E0E0E0; line-height: 1.5;">${data.message}</div>
    </div>
    ${files.length > 0 ? `
    <div style="background-color: #1a1a1a; border: 1px solid #2e2e2e; border-radius: 6px; padding: 14px; margin-bottom: 20px;">
      <h4 style="margin: 0 0 10px 0; color: #C9A84C; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
        📎 Attached Artwork & Files (${files.length}):
      </h4>
      <ul style="margin: 0; padding-left: 20px; color: #CCCCCC; font-size: 13px; line-height: 1.6;">
        ${files.map(f => `<li><strong style="color: #FFFFFF;">${f.originalname}</strong> <span style="color: #888888;">(${(f.size / 1024).toFixed(0)} KB)</span></li>`).join('')}
      </ul>
    </div>
    ` : ''}
  `;

  const mailOptions = {
    to: OWNER_EMAIL,
    from: `"Apex Print Hub" <${EMAIL_FROM}>`,
    replyTo: data.email,
    subject: `📨 New Order Request: ${data.service} — ${data.name}`,
    preheader: `New order request submitted by ${data.name} for ${data.service}.`,
    html
  };

  if (files.length > 0) {
    mailOptions.attachments = files.map(f => ({
      filename: f.originalname,
      ...(f.buffer ? { content: f.buffer } : (f.path ? { path: f.path } : {}))
    }));
  }

  return sendEmail(mailOptions);
}

// 2. Customer Confirmation for Order Request or Contact
async function confirmCustomerContact(data) {
  const files = data.files || (data.file ? [data.file] : []);
  const cartItemsWithDesign = (data.cartData && Array.isArray(data.cartData))
    ? data.cartData.filter(it => it && it.design && (it.design.name || it.design.url))
    : [];

  let customerArtworkHtml = '';
  if (cartItemsWithDesign.length > 0) {
    customerArtworkHtml = `
    <div style="background-color: #1a1a1a; border: 1px solid #2e2e2e; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
      <h4 style="margin: 0 0 10px 0; color: #C9A84C; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
        🎨 Uploaded Production Artwork (${cartItemsWithDesign.length}):
      </h4>
      <p style="margin: 0 0 12px 0; font-size: 13px; color: #AAAAAA; line-height: 1.5;">
        Your high-resolution artwork files have been received and securely stored for prepress review.
      </p>
      <table width="100%" style="font-size: 13px; color: #CCCCCC; border-collapse: collapse;">
        ${cartItemsWithDesign.map(it => {
          const sizeMB = typeof it.design.size === 'number' ? (it.design.size / (1024 * 1024)).toFixed(2) : '0.00';
          const hasCloudUrl = it.design.url && (it.design.url.startsWith('http://') || it.design.url.startsWith('https://'));
          return `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #262626;">
              <strong style="color: #FFFFFF;">${it.title || 'Product'}:</strong> ${it.design.name || 'Artwork file'} <span style="color: #888888;">(${sizeMB} MB)</span>
            </td>
            <td align="right" style="padding: 8px 0; border-bottom: 1px solid #262626;">
              ${hasCloudUrl 
                ? `<a href="${it.design.url}" target="_blank" style="background-color: #262626; border: 1px solid #C9A84C; color: #C9A84C; padding: 4px 10px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 11px; display: inline-block;">Download File ↗</a>` 
                : `<span style="color: #888888; font-size: 11px;">Attached to Request</span>`}
            </td>
          </tr>
          `;
        }).join('')}
      </table>
    </div>`;
  }

  const html = `
    <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0; margin-bottom: 12px;">
      Thank You For Your Order Request
    </h2>
    <p style="color: #CCCCCC; margin-top: 0; margin-bottom: 20px;">
      Dear <strong style="color: #FFFFFF;">${data.name}</strong>,<br>
      We have received your custom order request for <strong style="color: #C9A84C;">${data.service}</strong>. Our dedicated print specialists are currently reviewing your specifications to prepare your quote and digital proof.
    </p>

    <div style="background-color: #1a1a1a; border: 1px solid #2e2e2e; border-radius: 6px; padding: 18px; margin-bottom: 20px;">
      <h3 style="color: #C9A84C; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">Request Summary:</h3>
      <table width="100%" style="font-size: 14px; color: #CCCCCC;">
        <tr><td width="30%" style="padding: 5px 0; color: #888888;"><strong>Service:</strong></td><td style="padding: 5px 0; color: #FFFFFF;">${data.service}</td></tr>
        <tr><td style="padding: 5px 0; color: #888888;"><strong>Contact Email:</strong></td><td style="padding: 5px 0; color: #FFFFFF;">${data.email}</td></tr>
        ${data.phone ? `<tr><td style="padding: 5px 0; color: #888888;"><strong>Contact Phone:</strong></td><td style="padding: 5px 0; color: #FFFFFF;">${data.phone}</td></tr>` : ''}
        ${data.country ? `<tr><td style="padding: 5px 0; color: #888888;"><strong>Region / Country:</strong></td><td style="padding: 5px 0; color: #FFFFFF;">${data.country}</td></tr>` : ''}
        ${files.length > 0 ? `
        <tr>
          <td width="30%" style="padding: 5px 0; color: #888888; vertical-align: top;"><strong>Attached Files:</strong></td>
          <td style="padding: 5px 0; color: #C9A84C;">
            ${files.map(f => `<div>✓ ${f.originalname} <span style="color: #888888; font-size: 12px;">(${(f.size / 1024).toFixed(0)} KB)</span></div>`).join('')}
          </td>
        </tr>` : ''}
        ${cartItemsWithDesign.length > 0 ? `
        <tr>
          <td width="30%" style="padding: 5px 0; color: #888888; vertical-align: top;"><strong>Cart Artwork:</strong></td>
          <td style="padding: 5px 0; color: #CCCCCC;">
            ${cartItemsWithDesign.map(it => {
              const sizeMB = typeof it.design.size === 'number' ? (it.design.size / (1024 * 1024)).toFixed(2) : '0.00';
              const hasCloudUrl = it.design.url && (it.design.url.startsWith('http://') || it.design.url.startsWith('https://'));
              return `<div style="margin-bottom: 4px;">
                <span style="color: #C9A84C;">✓</span> <strong>${it.title || 'Product'}:</strong> ${it.design.name || 'Artwork'} <span style="color: #888888; font-size: 12px;">(${sizeMB} MB)</span>
                ${hasCloudUrl ? `&nbsp;&middot;&nbsp;<a href="${it.design.url}" target="_blank" style="color: #C9A84C; text-decoration: none; font-size: 12px;">Download ↗</a>` : ''}
              </div>`;
            }).join('')}
          </td>
        </tr>` : ''}
      </table>
    </div>

    ${customerArtworkHtml}

    <div style="margin-bottom: 25px;">
      <h3 style="color: #C9A84C; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Submitted Specifications:</h3>
      <div style="white-space: pre-wrap; background-color: #1a1a1a; padding: 15px; border-left: 3px solid #C9A84C; border-radius: 0 4px 4px 0; font-family: monospace; font-size: 13px; color: #DDDDDD; line-height: 1.5;">${data.message}</div>
    </div>

    <div style="background-color: rgba(201, 168, 76, 0.08); border: 1px solid rgba(201, 168, 76, 0.25); border-radius: 6px; padding: 16px; margin-bottom: 20px;">
      <h4 style="margin: 0 0 6px 0; color: #C9A84C; font-size: 14px;">Next Steps:</h4>
      <p style="margin: 0; font-size: 13px; color: #BBBBBB;">
        A production specialist will reach out to you within <strong>24 business hours</strong> with personalized pricing, digital proofing instructions, and production lead times.
      </p>
    </div>

    <p style="font-size: 14px; color: #888888; margin-bottom: 0;">
      Warm regards,<br>
      <strong style="color: #FFFFFF;">The Apex Print Hub Production Team</strong><br>
      <a href="mailto:${EMAIL_REPLY_TO}" style="color: #C9A84C; text-decoration: none;">${EMAIL_REPLY_TO}</a>
    </p>
  `;

  return sendEmail({
    to: data.email,
    from: `"Apex Print Hub" <${EMAIL_FROM}>`,
    replyTo: EMAIL_REPLY_TO,
    subject: `Order Request Received: ${data.service} — Apex Print Hub`,
    preheader: `Thank you for your order request for ${data.service}. Our team will contact you shortly.`,
    html
  });
}

// 3. Notify Owner / Admin about Formal Quote Request
async function notifyOwnerNewQuote(data) {
  const html = `
    <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid #2a2a2a; padding-bottom: 12px;">
      📋 New Direct Quote Request
    </h2>
    <div style="background-color: #1a1a1a; border: 1px solid #2e2e2e; border-radius: 6px; padding: 18px; margin-bottom: 20px;">
      <table width="100%" style="font-size: 14px; color: #CCCCCC;">
        <tr><td width="30%" style="padding: 5px 0; color: #888888;"><strong>Client Name:</strong></td><td style="padding: 5px 0; color: #FFFFFF; font-weight: bold;">${data.name}</td></tr>
        <tr><td style="padding: 5px 0; color: #888888;"><strong>Email:</strong></td><td style="padding: 5px 0;"><a href="mailto:${data.email}" style="color: #C9A84C; text-decoration: none;">${data.email}</a></td></tr>
        <tr><td style="padding: 5px 0; color: #888888;"><strong>Phone:</strong></td><td style="padding: 5px 0; color: #FFFFFF;">${data.phone || 'Not provided'}</td></tr>
        <tr><td style="padding: 5px 0; color: #888888;"><strong>Region:</strong></td><td style="padding: 5px 0; color: #FFFFFF;">${data.country || 'N/A'}</td></tr>
        <tr><td style="padding: 5px 0; color: #888888;"><strong>Service:</strong></td><td style="padding: 5px 0; color: #C9A84C; font-weight: bold;">${data.service}</td></tr>
      </table>
    </div>

    <div style="background-color: #1a1a1a; border: 1px solid #2e2e2e; border-radius: 6px; padding: 18px; margin-bottom: 20px;">
      <h3 style="color: #C9A84C; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0;">Itemized Options:</h3>
      <table width="100%" style="font-size: 13px; color: #CCCCCC;">
        <tr><td width="30%" style="padding: 4px 0; color: #888888;"><strong>Quantity:</strong></td><td style="padding: 4px 0; color: #FFFFFF;">${data.quantity || 'Custom'}</td></tr>
        <tr><td style="padding: 4px 0; color: #888888;"><strong>Dimensions / Size:</strong></td><td style="padding: 4px 0; color: #FFFFFF;">${data.size || 'Standard / Custom'}</td></tr>
        <tr><td style="padding: 4px 0; color: #888888;"><strong>Paper Stock:</strong></td><td style="padding: 4px 0; color: #FFFFFF;">${data.paper_type || 'Custom'}</td></tr>
        <tr><td style="padding: 4px 0; color: #888888;"><strong>Finishing:</strong></td><td style="padding: 4px 0; color: #FFFFFF;">${data.finishing || 'None'}</td></tr>
        <tr><td style="padding: 4px 0; color: #888888;"><strong>Printed Sides:</strong></td><td style="padding: 4px 0; color: #FFFFFF;">${data.sides || 'Single / Double'}</td></tr>
        <tr><td style="padding: 4px 0; color: #888888;"><strong>Artwork Ready:</strong></td><td style="padding: 4px 0; color: #FFFFFF;">${data.artwork_ready ? 'Yes' : 'No (Design Assistance Needed)'}</td></tr>
      </table>
    </div>

    ${data.notes ? `
    <div style="margin-bottom: 20px;">
      <h3 style="color: #C9A84C; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Customer Notes:</h3>
      <div style="white-space: pre-wrap; background-color: #1a1a1a; padding: 12px; border-left: 3px solid #C9A84C; border-radius: 0 4px 4px 0; font-size: 13px; color: #DDDDDD;">${data.notes}</div>
    </div>
    ` : ''}
  `;

  return sendEmail({
    to: OWNER_EMAIL,
    from: `"Apex Print Hub" <${EMAIL_FROM}>`,
    replyTo: data.email,
    subject: `📋 Direct Quote Request: ${data.service} — ${data.name}`,
    preheader: `Direct quote request from ${data.name} for ${data.service}.`,
    html
  });
}

// 4. Customer Confirmation for Quote Request
async function confirmCustomerQuote(data) {
  const html = `
    <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0; margin-bottom: 12px;">
      Quote Request Received
    </h2>
    <p style="color: #CCCCCC; margin-top: 0; margin-bottom: 20px;">
      Dear <strong style="color: #FFFFFF;">${data.name}</strong>,<br>
      Thank you for requesting a quotation for <strong style="color: #C9A84C;">${data.service}</strong>. We have logged your job specifications and our estimators are preparing your custom quote.
    </p>

    <div style="background-color: #1a1a1a; border: 1px solid #2e2e2e; border-radius: 6px; padding: 18px; margin-bottom: 20px;">
      <h3 style="color: #C9A84C; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0;">Specification Details:</h3>
      <table width="100%" style="font-size: 13px; color: #CCCCCC;">
        <tr><td width="35%" style="padding: 4px 0; color: #888888;"><strong>Service:</strong></td><td style="padding: 4px 0; color: #FFFFFF;">${data.service}</td></tr>
        <tr><td style="padding: 4px 0; color: #888888;"><strong>Quantity:</strong></td><td style="padding: 4px 0; color: #FFFFFF;">${data.quantity || 'Custom'}</td></tr>
        <tr><td style="padding: 4px 0; color: #888888;"><strong>Size / Dimensions:</strong></td><td style="padding: 4px 0; color: #FFFFFF;">${data.size || 'Standard / Custom'}</td></tr>
        <tr><td style="padding: 4px 0; color: #888888;"><strong>Paper Stock:</strong></td><td style="padding: 4px 0; color: #FFFFFF;">${data.paper_type || 'Custom'}</td></tr>
        <tr><td style="padding: 4px 0; color: #888888;"><strong>Finishing:</strong></td><td style="padding: 4px 0; color: #FFFFFF;">${data.finishing || 'None'}</td></tr>
        <tr><td style="padding: 4px 0; color: #888888;"><strong>Printed Sides:</strong></td><td style="padding: 4px 0; color: #FFFFFF;">${data.sides || 'Single / Double'}</td></tr>
        ${data.country ? `<tr><td style="padding: 4px 0; color: #888888;"><strong>Region / Country:</strong></td><td style="padding: 4px 0; color: #FFFFFF;">${data.country}</td></tr>` : ''}
      </table>
    </div>

    ${data.notes ? `
    <div style="margin-bottom: 20px;">
      <h3 style="color: #C9A84C; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Your Notes:</h3>
      <div style="white-space: pre-wrap; background-color: #1a1a1a; padding: 12px; border-left: 3px solid #C9A84C; border-radius: 0 4px 4px 0; font-size: 13px; color: #DDDDDD;">${data.notes}</div>
    </div>
    ` : ''}

    <div style="background-color: rgba(201, 168, 76, 0.08); border: 1px solid rgba(201, 168, 76, 0.25); border-radius: 6px; padding: 16px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #BBBBBB;">
        Our team is reviewing your project requirements and will reply with a detailed pricing breakdown within <strong>24 business hours</strong>.
      </p>
    </div>

    <p style="font-size: 14px; color: #888888; margin-bottom: 0;">
      Best regards,<br>
      <strong style="color: #FFFFFF;">The Apex Print Hub Estimation Team</strong><br>
      <a href="mailto:${EMAIL_REPLY_TO}" style="color: #C9A84C; text-decoration: none;">${EMAIL_REPLY_TO}</a>
    </p>
  `;

  return sendEmail({
    to: data.email,
    from: `"Apex Print Hub" <${EMAIL_FROM}>`,
    replyTo: EMAIL_REPLY_TO,
    subject: `Quote Request Confirmation: ${data.service} — Apex Print Hub`,
    preheader: `We have received your quotation request for ${data.service}.`,
    html
  });
}

module.exports = {
  notifyOwnerNewContact,
  confirmCustomerContact,
  notifyOwnerNewQuote,
  confirmCustomerQuote
};
