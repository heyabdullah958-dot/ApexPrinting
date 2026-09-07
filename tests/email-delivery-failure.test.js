const assert = require('assert');
const http = require('http');

process.env.NODE_ENV = 'test';
process.env.PORT = '3098';

const app = require('../backend/server');
let server;
const BASE_URL = 'http://localhost:3098';

function buildMultipartBody(fields, boundary) {
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
  parts.push(Buffer.from(`--${boundary}--${crlf}`));
  return Buffer.concat(parts);
}

async function runTests() {
  console.log('--- STARTING EMAIL DELIVERY FAILURE & RESILIENCE TESTS ---');
  server = app.listen(3098);

  try {
    // 1. Test POST /api/contact when email dispatch succeeds
    console.log('\n[Test 1] Testing /api/contact when email delivery succeeds (test mock)...');
    process.env.EMAIL_USER = 'test@apexprinthub.com';
    process.env.EMAIL_PASS = 'testpass123';

    const boundary = '----BoundarySuccessTest';
    const bodySuccess = buildMultipartBody({
      name: 'Valid Customer',
      email: 'customer@example.com',
      phone: '+1234567890',
      country: 'UAE',
      service: 'Business Cards',
      message: 'Testing successful submission'
    }, boundary);

    const resSuccess = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: bodySuccess
    });
    assert.strictEqual(resSuccess.status, 200, 'Should return 200 OK when email succeeds');
    const jsonSuccess = await resSuccess.json();
    assert.strictEqual(jsonSuccess.success, true);
    console.log('✓ Test 1 Passed: Returns 200 OK when email delivery succeeds');

    // 2. Test POST /api/contact when email delivery FAILS
    console.log('\n[Test 2] Testing /api/contact when email delivery fails (simulated SMTP network drop)...');
    // Point to non-existent test credentials that trigger failure
    process.env.EMAIL_USER = 'fail_test_user@invalid-domain.xyz';
    process.env.EMAIL_PASS = 'wrongpass';

    const bodyFail = buildMultipartBody({
      name: 'Failing Customer',
      email: 'customer@example.com',
      phone: '+1234567890',
      country: 'UAE',
      service: 'Flyers',
      message: 'Testing email failure scenario'
    }, boundary);

    const resFail = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: bodyFail
    });

    assert.notStrictEqual(resFail.status, 200, 'MUST NOT return 200 OK when email delivery fails');
    assert.ok(resFail.status >= 500, `Should return 5xx error on email failure (received ${resFail.status})`);
    const jsonFail = await resFail.json();
    assert.strictEqual(jsonFail.success, false, 'success MUST be false');
    assert.ok(jsonFail.error.includes('EMAIL') || jsonFail.error.includes('FAILED'), 'error must indicate email delivery failure');
    assert.ok(jsonFail.message.includes('quotes@apexprinthub.com'), 'message must direct customer to quotes@apexprinthub.com');
    console.log(`✓ Test 2 Passed: Correctly returned ${resFail.status} structured error without false-positive success`);

    // 3. Test POST /api/quote when email delivery FAILS
    console.log('\n[Test 3] Testing /api/quote when email delivery fails...');
    const resQuoteFail = await fetch(`${BASE_URL}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Failing Quote Customer',
        email: 'customer@example.com',
        phone: '+1234567890',
        service: 'Brochures',
        quantity: '500',
        size: '8.5x11'
      })
    });

    assert.notStrictEqual(resQuoteFail.status, 200, 'Quote endpoint MUST NOT return 200 OK when email delivery fails');
    assert.ok(resQuoteFail.status >= 500, `Quote should return 5xx on email failure (received ${resQuoteFail.status})`);
    const jsonQuoteFail = await resQuoteFail.json();
    assert.strictEqual(jsonQuoteFail.success, false);
    assert.ok(jsonQuoteFail.message.includes('quotes@apexprinthub.com'));
    console.log(`✓ Test 3 Passed: /api/quote correctly returned ${resQuoteFail.status} structured error`);

    // 4. Test POST /api/quote when email delivery SUCCEEDS
    console.log('\n[Test 4] Testing /api/quote when email delivery succeeds...');
    process.env.EMAIL_USER = 'test@apexprinthub.com';
    process.env.EMAIL_PASS = 'testpass123';

    const resQuoteSuccess = await fetch(`${BASE_URL}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Happy Quote Customer',
        email: 'customer@example.com',
        phone: '+1234567890',
        service: 'Brochures',
        quantity: '500',
        size: '8.5x11'
      })
    });

    assert.strictEqual(resQuoteSuccess.status, 200);
    const jsonQuoteSuccess = await resQuoteSuccess.json();
    assert.strictEqual(jsonQuoteSuccess.success, true);
    console.log('✓ Test 4 Passed: /api/quote returns 200 OK on email success');

    console.log('\n========================================================');
    console.log('🎉 ALL EMAIL DELIVERY FAILURE & RECOVERY TESTS PASSED!');
    console.log('========================================================');

  } finally {
    if (server) server.close();
  }
}

runTests();
