const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const app = require('../backend/server');

let server;
const PORT = 3088;
const BASE_URL = `http://localhost:${PORT}`;

function buildMultipartBody(fields, files, boundary) {
  const crlf = '\r\n';
  const parts = [];

  for (const [key, val] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="${key}"${crlf}${crlf}` +
        `${val}${crlf}`
      )
    );
  }

  for (const file of files) {
    parts.push(
      Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="${file.field}"; filename="${file.filename}"${crlf}` +
        `Content-Type: ${file.contentType || 'application/octet-stream'}${crlf}${crlf}`
      )
    );
    parts.push(file.content);
    parts.push(Buffer.from(crlf));
  }

  parts.push(Buffer.from(`--${boundary}--${crlf}`));
  return Buffer.concat(parts);
}

async function runEmailAudit() {
  console.log('========================================================================');
  console.log('📧 PHASE 1: END-TO-END TRANSACTIONAL EMAIL AUDIT & VERIFICATION');
  console.log('========================================================================\n');

  console.log('Active Environment Configuration:');
  console.log(`- SMTP User: ${process.env.EMAIL_USER}`);
  console.log(`- Owner Email: ${process.env.OWNER_EMAIL}`);
  console.log(`- Email From: ${process.env.EMAIL_FROM}`);
  console.log(`- Email From Address: ${process.env.EMAIL_FROM_ADDRESS}`);
  console.log(`- Email Reply-To: ${process.env.EMAIL_REPLY_TO}\n`);

  server = app.listen(PORT);

  try {
    // -------------------------------------------------------------
    // STAGE 1: Real Order Submission with Attached File & Cloud Links
    // -------------------------------------------------------------
    console.log('[STAGE 1] Testing POST /api/contact order email delivery to business & real customer inbox...');
    const testCustomerEmail = 'abdullahhere958@gmail.com';
    const boundary = '----BoundaryAuditTest7MA4YW';

    const cartData = [
      {
        title: 'Luxury Gold Business Cards',
        design: {
          name: 'apex_gold_emboss_dieline.pdf',
          size: 3145728, // 3.00 MB
          url: 'https://storage.supabase.co/v0/b/order-artworks/apex_gold_emboss_dieline.pdf'
        }
      }
    ];

    const sampleImage = Buffer.alloc(15 * 1024, 0x42); // 15KB dummy PNG
    const multipartBody = buildMultipartBody(
      {
        name: 'Abdullah Test Client',
        email: testCustomerEmail,
        phone: '+971 50 123 4567',
        country: 'UAE',
        service: 'Business Cards',
        message: 'Order dispatch audit verification with attached artwork & cloud link.',
        cart_data: JSON.stringify(cartData)
      },
      [
        {
          field: 'design_file',
          filename: 'customer_logo_proof.png',
          contentType: 'image/png',
          content: sampleImage
        }
      ],
      boundary
    );

    const contactStart = Date.now();
    const resContact = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: multipartBody
    });
    const contactDuration = Date.now() - contactStart;

    console.log(`HTTP Status: ${resContact.status} (took ${contactDuration}ms)`);
    const jsonContact = await resContact.json();
    console.log('Response Payload:', jsonContact);

    assert.strictEqual(resContact.status, 200, 'Order submission endpoint must return HTTP 200 OK');
    assert.strictEqual(jsonContact.success, true, 'success field must be true');
    assert.strictEqual(jsonContact.customerEmailSent, true, 'Customer confirmation email dispatch must be true');
    assert.ok(jsonContact.message.includes('received'), 'Confirmation message must acknowledge receipt');
    console.log('✓ STAGE 1 PASSED: Order submission accepted, dual emails dispatched and logged.\n');

    // -------------------------------------------------------------
    // STAGE 2: Real Quote Request Dispatch
    // -------------------------------------------------------------
    console.log('[STAGE 2] Testing POST /api/quote direct quote email delivery...');
    const quotePayload = {
      name: 'Abdullah Quote Client',
      email: testCustomerEmail,
      phone: '+971 50 987 6543',
      country: 'UAE',
      service: 'Brochures',
      quantity: '2500',
      size: 'A4 Tri-Fold',
      paper_type: '350 GSM Silk Coated',
      finishing: 'Matte Lamination + Spot UV',
      sides: 'Double Sided',
      artwork_ready: true,
      notes: 'Please verify Pantone metallic gold ink options.'
    };

    const quoteStart = Date.now();
    const resQuote = await fetch(`${BASE_URL}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quotePayload)
    });
    const quoteDuration = Date.now() - quoteStart;

    console.log(`HTTP Status: ${resQuote.status} (took ${quoteDuration}ms)`);
    const jsonQuote = await resQuote.json();
    console.log('Response Payload:', jsonQuote);

    assert.strictEqual(resQuote.status, 200, 'Quote endpoint must return HTTP 200 OK');
    assert.strictEqual(jsonQuote.success, true, 'Quote submission must succeed');
    assert.strictEqual(jsonQuote.customerEmailSent, true, 'Customer quote confirmation must be true');
    console.log('✓ STAGE 2 PASSED: Quote request accepted, dual emails dispatched and logged.\n');

    console.log('========================================================================');
    console.log('🎉 ALL EMAIL DISPATCH & DELIVERY VERIFICATION STAGES PASSED!');
    console.log('========================================================================\n');

  } finally {
    if (server) server.close();
  }
}

runEmailAudit().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('\n❌ AUDIT TEST FAILED:', err);
  if (server) server.close();
  process.exit(1);
});
