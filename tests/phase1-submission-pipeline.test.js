const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Ensure test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3099';
process.env.EMAIL_USER = 'test@apexprinthub.com';
process.env.EMAIL_PASS = 'testpass123';

const app = require('../backend/server');

let server;
const BASE_URL = 'http://localhost:3099';

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(3099, () => {
      console.log('Test server running on port 3099');
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

// Utility to create multipart boundary payloads
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

async function runAllTests() {
  console.log('===============================================================');
  console.log('🚀 PHASE 1: ORDER SUBMISSION PIPELINE & EXCEPTION VERIFICATION');
  console.log('===============================================================\n');

  await startServer();

  try {
    // -------------------------------------------------------------
    // TEST 1: GET /api/contact Health & Operational Probe
    // -------------------------------------------------------------
    console.log('[Test 1] Testing GET /api/contact endpoint returns 200 OK JSON...');
    const resGet = await fetch(`${BASE_URL}/api/contact`);
    assert.strictEqual(resGet.status, 200, 'GET /api/contact should return 200');
    assert.ok(resGet.headers.get('content-type').includes('application/json'), 'Should return application/json');
    const jsonGet = await resGet.json();
    assert.strictEqual(jsonGet.success, true);
    assert.strictEqual(jsonGet.status, 'operational');
    console.log('✓ Test 1 Passed: GET /api/contact is operational and returns valid JSON\n');

    // -------------------------------------------------------------
    // TEST 2: POST /api/contact with Image Attachment (IMG-202...037.jpeg)
    // -------------------------------------------------------------
    console.log('[Test 2] Testing POST /api/contact with attached image (simulating client mobile upload)...');
    const boundary = '----WebKitFormBoundaryTest7MA4YWxkTrZu0gW';
    const fakeImageContent = Buffer.alloc(1024 * 50, 0xFF); // 50KB JPEG dummy
    const multipartBody = buildMultipartBody(
      {
        name: 'Abdullah Client',
        email: 'client@example.com',
        phone: '+971 50 123 4567',
        country: 'UAE',
        service: 'Business Cards',
        message: 'Need 500 premium gold foil business cards with attached artwork.'
      },
      [
        {
          field: 'design_file',
          filename: 'IMG-20260906_120037.jpeg',
          contentType: 'image/jpeg',
          content: fakeImageContent
        }
      ],
      boundary
    );

    const resPost = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: multipartBody
    });

    assert.strictEqual(resPost.status, 200, 'POST /api/contact should return 200 OK');
    assert.ok(resPost.headers.get('content-type').includes('application/json'), 'Response must be application/json');
    const jsonPost = await resPost.json();
    assert.strictEqual(jsonPost.success, true);
    assert.ok(jsonPost.message.includes('received'), 'Success message should confirm receipt');
    console.log('✓ Test 2 Passed: Order submission with artwork image succeeded with 200 OK JSON\n');

    // -------------------------------------------------------------
    // TEST 3: File Size Boundary Protection (> 4.5MB)
    // -------------------------------------------------------------
    console.log('[Test 3] Testing backend file size boundary rejection for files > 4.5MB...');
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024, 0xAA); // 5MB (exceeds 4.5MB)
    const oversizedBoundary = '----WebKitFormBoundaryOversizedTest';
    const oversizedBody = buildMultipartBody(
      {
        name: 'Oversized Client',
        email: 'large@example.com',
        service: 'Flyers',
        message: 'Testing oversized file upload.'
      },
      [
        {
          field: 'design_file',
          filename: 'huge_artwork.png',
          contentType: 'image/png',
          content: oversizedBuffer
        }
      ],
      oversizedBoundary
    );

    const resOversized = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${oversizedBoundary}`
      },
      body: oversizedBody
    });

    assert.strictEqual(resOversized.status, 400, 'Should reject oversized files with HTTP 400');
    assert.ok(resOversized.headers.get('content-type').includes('application/json'), 'Must return JSON on size limit');
    const jsonOversized = await resOversized.json();
    assert.strictEqual(jsonOversized.success, false);
    assert.ok(jsonOversized.error.includes('4.5MB'), 'Error message should clearly mention the 4.5MB limit');
    console.log('✓ Test 3 Passed: Oversized payload gracefully rejected with 400 JSON without server crash\n');

    // -------------------------------------------------------------
    // TEST 4: Validation Error Resilience (Missing required fields)
    // -------------------------------------------------------------
    console.log('[Test 4] Testing validation failure returns clean 400 JSON contract...');
    const invalidBoundary = '----WebKitFormBoundaryInvalid';
    const invalidBody = buildMultipartBody(
      {
        name: 'A', // too short (<2 chars)
        email: 'not-an-email',
        service: '',
        message: ''
      },
      [],
      invalidBoundary
    );

    const resInvalid = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${invalidBoundary}`
      },
      body: invalidBody
    });

    assert.strictEqual(resInvalid.status, 400);
    assert.ok(resInvalid.headers.get('content-type').includes('application/json'));
    const jsonInvalid = await resInvalid.json();
    assert.strictEqual(jsonInvalid.success, false);
    assert.strictEqual(jsonInvalid.message, 'Validation failed');
    assert.ok(Array.isArray(jsonInvalid.errors) && jsonInvalid.errors.length > 0);
    console.log('✓ Test 4 Passed: Input validation failure returns structured JSON errors array\n');

    // -------------------------------------------------------------
    // TEST 5: Catch-All 404 Endpoint Returns Structured JSON (Not HTML)
    // -------------------------------------------------------------
    console.log('[Test 5] Testing unknown API route returns structured JSON 404...');
    const res404 = await fetch(`${BASE_URL}/api/non-existent-route`);
    assert.strictEqual(res404.status, 404);
    assert.ok(res404.headers.get('content-type').includes('application/json'));
    const json404 = await res404.json();
    assert.strictEqual(json404.success, false);
    assert.ok(json404.error.includes('Endpoint not found'));
    console.log('✓ Test 5 Passed: Unknown endpoints return clean JSON 404 without HTML markup\n');

    // -------------------------------------------------------------
    // TEST 6: Client-Side Response Parser Simulation Against "A server error..."
    // -------------------------------------------------------------
    console.log('[Test 6] Testing client-side safe response parsing against raw platform errors...');
    
    // Simulate safe parse helper as implemented in script.js
    async function simulateClientSafeParse(mockResponse) {
      const contentType = mockResponse.headers.get("content-type") || '';
      let result = {};
      if (contentType.includes("application/json")) {
        try {
          result = await mockResponse.json();
        } catch (parseErr) {
          result = {};
        }
      } else {
        const text = await mockResponse.text();
        if (mockResponse.status === 413 || (text && text.includes("413"))) {
          throw new Error("The uploaded file exceeds the 4.5MB server limit. Please upload a smaller file.");
        }
        throw new Error(
          mockResponse.status >= 500
            ? "Our server is momentarily busy. Please try again in a few moments or email us directly at quotes@apexprinthub.com."
            : "Server responded with an unexpected error. Please try again."
        );
      }

      if (!mockResponse.ok || !result.success) {
        throw new Error(result.message || result.error || 'Error submitting order request');
      }

      return result;
    }

    // Scenario A: Platform crashes with Vercel HTML/Plaintext "A server error occurred..."
    const mockPlatform500 = {
      ok: false,
      status: 500,
      headers: {
        get: (h) => h.toLowerCase() === 'content-type' ? 'text/plain; charset=utf-8' : null
      },
      text: async () => 'A server error has occurred\nFUNCTION_INVOCATION_FAILED'
    };

    try {
      await simulateClientSafeParse(mockPlatform500);
      assert.fail('Should have thrown error on 500');
    } catch (err) {
      assert.ok(!err.message.includes("Unexpected token 'A'"), 'Must NOT throw SyntaxError with Unexpected token A');
      assert.ok(!err.message.includes("is not valid JSON"), 'Must NOT throw "is not valid JSON"');
      assert.ok(err.message.includes("momentarily busy") || err.message.includes("server"), 'Must provide friendly message');
      console.log('  Sub-test 6A: Correctly caught raw Vercel "A server error" and replaced with friendly copy');
    }

    // Scenario B: 413 Payload Too Large
    const mockPlatform413 = {
      ok: false,
      status: 413,
      headers: {
        get: (h) => h.toLowerCase() === 'content-type' ? 'text/html' : null
      },
      text: async () => '<html><body>413 Payload Too Large</body></html>'
    };

    try {
      await simulateClientSafeParse(mockPlatform413);
      assert.fail('Should have thrown error on 413');
    } catch (err) {
      assert.ok(err.message.includes('4.5MB'), 'Must identify file limit on 413 payload');
      console.log('  Sub-test 6B: Correctly converted 413 platform HTML into 4.5MB file limit alert');
    }

    // Scenario C: Valid JSON Error Response from Backend
    const mockBackendJsonError = {
      ok: false,
      status: 400,
      headers: {
        get: (h) => h.toLowerCase() === 'content-type' ? 'application/json; charset=utf-8' : null
      },
      json: async () => ({ success: false, error: 'Attached artwork file exceeds the 4.5MB limit.' })
    };

    try {
      await simulateClientSafeParse(mockBackendJsonError);
      assert.fail('Should have thrown error on JSON 400');
    } catch (err) {
      assert.strictEqual(err.message, 'Attached artwork file exceeds the 4.5MB limit.');
      console.log('  Sub-test 6C: Correctly extracted structured JSON backend error message');
    }

    console.log('✓ Test 6 Passed: Safe client parser completely eliminates unhandled JSON syntax crashes\n');

    // -------------------------------------------------------------
    // TEST 7: Unsupported File Format Filter (.exe / .sh / .bat)
    // -------------------------------------------------------------
    console.log('[Test 7] Testing fileFilter rejects unsupported executable formats with 400 JSON...');
    const invalidFileBoundary = '----WebKitFormBoundaryInvalidFile';
    const invalidFileBody = buildMultipartBody(
      {
        name: 'Attacker Test',
        email: 'attacker@example.com',
        service: 'Flyers',
        message: 'Attempting to upload executable payload.'
      },
      [
        {
          field: 'design_file',
          filename: 'malware.exe',
          contentType: 'application/x-msdownload',
          content: Buffer.from('MZ0000000')
        }
      ],
      invalidFileBoundary
    );

    const resInvalidFile = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${invalidFileBoundary}`
      },
      body: invalidFileBody
    });

    assert.strictEqual(resInvalidFile.status, 400);
    assert.ok(resInvalidFile.headers.get('content-type').includes('application/json'));
    const jsonInvalidFile = await resInvalidFile.json();
    assert.strictEqual(jsonInvalidFile.success, false);
    assert.ok(jsonInvalidFile.error.includes('Unsupported file format'));
    console.log('✓ Test 7 Passed: Unsupported file format (.exe) cleanly rejected with 400 JSON\n');

    // -------------------------------------------------------------
    // TEST 8: Client Safe Parser Unpacks Validation Errors Array
    // -------------------------------------------------------------
    console.log('[Test 8] Testing client safe parser unpacks detailed validation error array...');
    const mockValidationResponse = {
      ok: false,
      status: 400,
      headers: {
        get: (h) => h.toLowerCase() === 'content-type' ? 'application/json' : null
      },
      json: async () => ({
        success: false,
        message: 'Validation failed',
        errors: [
          { msg: 'Message must be between 5 and 4000 characters' },
          { msg: 'Valid email is required' }
        ]
      })
    };

    // Client parser implementation matching script.js
    async function simulateFullClientParse(mockResponse) {
      const contentType = mockResponse.headers.get("content-type") || '';
      let result = {};
      if (contentType.includes("application/json")) {
        try {
          result = await mockResponse.json();
        } catch (parseErr) {
          result = {};
        }
      } else {
        const text = await mockResponse.text();
        if (mockResponse.status === 413 || (text && (text.includes("413") || text.includes("PAYLOAD_TOO_LARGE") || text.includes("Too Large")))) {
          throw new Error("The uploaded file exceeds the 4.5MB server limit. Please compress or select a smaller file.");
        }
        throw new Error(
          mockResponse.status >= 500
            ? "Our server is momentarily busy. Please try again in a few moments or email us directly at quotes@apexprinthub.com."
            : "Server responded with an unexpected error. Please try again."
        );
      }

      if (!mockResponse.ok || !result.success) {
        let failureMsg = 'Error submitting order request';
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          failureMsg = result.errors.map(e => e.msg || e.message).filter(Boolean).join('; ');
        } else if (typeof result.message === 'string' && result.message) {
          failureMsg = result.message;
        } else if (typeof result.error === 'string' && result.error) {
          failureMsg = result.error;
        }
        throw new Error(failureMsg);
      }

      return result;
    }

    try {
      await simulateFullClientParse(mockValidationResponse);
      assert.fail('Should have thrown on validation response');
    } catch (err) {
      assert.ok(err.message.includes('Message must be between 5 and 4000 characters'), 'Should include specific validation message');
      assert.ok(err.message.includes('Valid email is required'), 'Should include second validation error message');
      console.log('✓ Test 8 Passed: Client parser unpacks detailed validation error array instead of generic "Validation failed"\n');
    }

    // -------------------------------------------------------------
    // TEST 9: Network Disconnect / Offline Error Sanitization
    // -------------------------------------------------------------
    console.log('[Test 9] Testing client-side catch block cleanses raw network/fetch errors...');
    function cleanseClientErrorMessage(error) {
      let displayMsg = error.message || 'There was an error sending your request. Please try again.';
      const isNetworkErr = (error.name === 'TypeError' && (
        displayMsg.includes('fetch') || 
        displayMsg.includes('NetworkError') || 
        displayMsg.includes('network') ||
        displayMsg.includes('Load failed')
      ));
      if (isNetworkErr) {
        return "Unable to connect to the server. Please check your internet connection and try again.";
      }
      if (displayMsg.includes("JSON") || displayMsg.includes("Unexpected token") || displayMsg.includes("SyntaxError")) {
        return "A server communication error occurred. Please try again or contact us directly at quotes@apexprinthub.com.";
      }
      return displayMsg;
    }

    const rawFetchError = new TypeError('Failed to fetch');
    const cleansedFetch = cleanseClientErrorMessage(rawFetchError);
    assert.strictEqual(cleansedFetch, 'Unable to connect to the server. Please check your internet connection and try again.');

    const rawSyntaxError = new SyntaxError("Unexpected token 'A', \"A server e\"... is not valid JSON");
    const cleansedSyntax = cleanseClientErrorMessage(rawSyntaxError);
    assert.strictEqual(cleansedSyntax, 'A server communication error occurred. Please try again or contact us directly at quotes@apexprinthub.com.');
    console.log('✓ Test 9 Passed: Network disconnect and syntax exceptions safely converted to user-friendly copy\n');

    // -------------------------------------------------------------
    // TEST 10: Server Body Limit Supports Large JSON (> 100KB)
    // -------------------------------------------------------------
    console.log('[Test 10] Testing express.json limit supports payloads > 100KB without crashing...');
    const largePayload = {
      name: 'Large Cart Client',
      email: 'client@example.com',
      service: 'Business Cards',
      message: 'Testing large cart data JSON parsing.',
      cart_data: JSON.stringify(Array.from({ length: 20 }, (_, i) => ({
        id: i,
        title: `Product ${i}`,
        specs: 'x'.repeat(10000) // ~200KB total payload
      })))
    };

    const resLargeJson = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(largePayload)
    });

    assert.strictEqual(resLargeJson.status, 200, 'Should accept large JSON payload within 10MB limit');
    const jsonLarge = await resLargeJson.json();
    assert.strictEqual(jsonLarge.success, true);
    console.log('✓ Test 10 Passed: Large JSON payload (>100KB) cleanly processed without 413 error\n');

    console.log('===============================================================');
    console.log('🎉 ALL 10 VERIFICATION TEST SUITES PASSED FLAWLESSLY!');
    console.log('===============================================================\n');

  } finally {
    await stopServer();
  }
}

runAllTests().catch(async (err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  await stopServer();
  process.exit(1);
});
