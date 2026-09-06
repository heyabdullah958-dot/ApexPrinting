const assert = require('assert');

async function testLivePost() {
  console.log('--- TEST 1: LIVE PRODUCTION POST /api/contact WITH VALID ARTWORK ---');
  const boundary = '----WebKitFormBoundaryLiveTest7MA4YWxkTrZu0gW';
  const crlf = '\r\n';
  const parts = [];

  const fields = {
    name: 'Production Verification Client',
    email: 'test-client@apexprinthub.com',
    phone: '+971 50 999 8888',
    country: 'UAE',
    service: 'Business Cards',
    message: 'Production verification test for Phase 1 fix with attached artwork.'
  };

  for (const [k, v] of Object.entries(fields)) {
    parts.push(Buffer.from(
      `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="${k}"${crlf}${crlf}` +
      `${v}${crlf}`
    ));
  }

  // Add dummy image
  parts.push(Buffer.from(
    `--${boundary}${crlf}` +
    `Content-Disposition: form-data; name="design_file"; filename="IMG-20260906_120037.jpeg"${crlf}` +
    `Content-Type: image/jpeg${crlf}${crlf}`
  ));
  parts.push(Buffer.alloc(20 * 1024, 0x55)); // 20KB JPEG
  parts.push(Buffer.from(crlf));
  parts.push(Buffer.from(`--${boundary}--${crlf}`));

  const body = Buffer.concat(parts);

  const res = await fetch('https://apex-printing-seven.vercel.app/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body
  });

  console.log('Live Status:', res.status);
  console.log('Live Content-Type:', res.headers.get('content-type'));
  const text = await res.text();
  console.log('Live Body:', text);

  assert.strictEqual(res.status, 200, 'Expected 200 OK from live production');
  assert.ok(res.headers.get('content-type').includes('application/json'), 'Expected application/json');
  const json = JSON.parse(text);
  assert.strictEqual(json.success, true);
  console.log('✓ Test 1: Live production order submission with artwork succeeded with 200 OK JSON!\n');

  console.log('--- TEST 2: LIVE PRODUCTION POST /api/contact WITH OVERSIZED FILE (>4.5MB) ---');
  const oversizedBoundary = '----WebKitFormBoundaryOversizedLive';
  const oversizedParts = [];
  for (const [k, v] of Object.entries(fields)) {
    oversizedParts.push(Buffer.from(
      `--${oversizedBoundary}${crlf}` +
      `Content-Disposition: form-data; name="${k}"${crlf}${crlf}` +
      `${v}${crlf}`
    ));
  }
  oversizedParts.push(Buffer.from(
    `--${oversizedBoundary}${crlf}` +
    `Content-Disposition: form-data; name="design_file"; filename="huge_art.jpg"${crlf}` +
    `Content-Type: image/jpeg${crlf}${crlf}`
  ));
  oversizedParts.push(Buffer.alloc(5 * 1024 * 1024, 0x77)); // 5MB
  oversizedParts.push(Buffer.from(crlf));
  oversizedParts.push(Buffer.from(`--${oversizedBoundary}--${crlf}`));

  const oversizedBody = Buffer.concat(oversizedParts);

  const resOversized = await fetch('https://apex-printing-seven.vercel.app/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${oversizedBoundary}` },
    body: oversizedBody
  });

  console.log('Oversized Status:', resOversized.status);
  console.log('Oversized Content-Type:', resOversized.headers.get('content-type'));
  const oversizedText = await resOversized.text();
  console.log('Oversized Body:', oversizedText);

  // Either rejected by Multer with 400 JSON or by Vercel gateway with 413
  assert.ok(resOversized.status === 400 || resOversized.status === 413, 'Expected 400 or 413 for oversized file');
  if (resOversized.status === 400) {
    const oversizedJson = JSON.parse(oversizedText);
    assert.strictEqual(oversizedJson.success, false);
    assert.ok(oversizedJson.error.includes('4.5MB'));
  }
  console.log('✓ Test 2: Live production handled oversized payload gracefully without server crash!\n');

  console.log('===============================================================');
  console.log('🎉 ALL LIVE PRODUCTION VERIFICATIONS PASSED 100%!');
  console.log('===============================================================');
}

testLivePost().catch((err) => {
  console.error('❌ LIVE PRODUCTION TEST FAILED:', err);
  process.exit(1);
});
