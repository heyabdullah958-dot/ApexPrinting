const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const express = require('express');

process.env.NODE_ENV = 'test';
process.env.PORT = '3098';

const backendApp = require('../backend/server');

// Create test host app that serves static files AND forwards API requests
const testApp = express();
testApp.use(express.static(path.join(__dirname, '..')));
testApp.use(backendApp);

async function runBrowserTest() {
  console.log('--- STARTING PLAYWRIGHT MOBILE ORDER SUBMISSION VERIFICATION ---');

  const server = testApp.listen(3098);
  const BASE_URL = 'http://localhost:3098';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile iPhone 13/14 viewport
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  try {
    console.log('[Step 1] Navigating to contact.html on mobile viewport (390x844)...');
    await page.goto(`${BASE_URL}/contact.html`, { waitUntil: 'domcontentloaded' });

    // Dismiss splash if present
    await page.evaluate(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) splash.style.display = 'none';
    });

    // Check contact form visibility
    const contactForm = await page.waitForSelector('#contactForm', { state: 'attached', timeout: 5000 });
    if (!contactForm) throw new Error('#contactForm not found on contact.html');
    console.log('✓ Step 1: contact.html loaded and #contactForm found.');

    // Step 2: Test file size validation on file input
    console.log('\n[Step 2] Testing instant client-side file size validation with oversized file...');
    const tempDir = path.join(__dirname, '../temp_test_artwork');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const oversizedFilePath = path.join(tempDir, 'oversized_photo.jpg');
    fs.writeFileSync(oversizedFilePath, Buffer.alloc(5 * 1024 * 1024, 0x12)); // 5MB

    const fileInput = await page.$('#design_file');
    await fileInput.setInputFiles(oversizedFilePath);

    // Give change event time to execute
    await page.waitForTimeout(300);

    const errorVisible = await page.evaluate(() => {
      const errEl = document.getElementById('designFileSizeError');
      const input = document.getElementById('design_file');
      return {
        isDisplayed: errEl && errEl.style.display !== 'none',
        text: errEl ? errEl.textContent : '',
        inputCleared: input.value === ''
      };
    });

    console.log('Oversized validation state:', errorVisible);
    if (!errorVisible.isDisplayed || !errorVisible.inputCleared) {
      throw new Error('Oversized file did not trigger validation error or clear input');
    }
    console.log('✓ Step 2: Oversized file (>4.5MB) rejected instantly with error text and cleared input.');

    // Step 3: Test valid image submission
    console.log('\n[Step 3] Submitting form with valid artwork attachment (IMG-20260906_120037.jpeg)...');
    const validFilePath = path.join(tempDir, 'IMG-20260906_120037.jpeg');
    fs.writeFileSync(validFilePath, Buffer.alloc(100 * 1024, 0x34)); // 100KB JPEG

    await fileInput.setInputFiles(validFilePath);

    // Fill in required fields
    await page.fill('#firstName', 'Alexander');
    await page.fill('#lastName', 'Wright');
    await page.fill('#email', 'alexander.wright@luxury-brands.com');
    await page.fill('#phone', '501234567');
    await page.selectOption('#service', 'Business Cards');
    await page.fill('#message', 'Need 1,000 foil stamped black matte cards with attached artwork.');

    // Click submit
    console.log('Clicking Submit Order Request button...');
    await page.click('#submitBtn');

    // Verify submission button states and form success
    await page.waitForSelector('#formSuccess', { state: 'visible', timeout: 8000 });

    const successVisible = await page.evaluate(() => {
      const successEl = document.getElementById('formSuccess');
      const formEl = document.getElementById('contactForm');
      return {
        successDisplayed: successEl && successEl.style.display !== 'none',
        formHidden: formEl && formEl.style.display === 'none'
      };
    });

    if (!successVisible.successDisplayed || !successVisible.formHidden) {
      throw new Error('Form did not switch cleanly to formSuccess view');
    }
    console.log('✓ Step 3: Form submitted successfully! #contactForm hidden and #formSuccess displayed.');

    // Step 4: Verify NO Unexpected token 'A' or syntax errors rendered in DOM
    const rawErrors = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        hasSyntaxError: bodyText.includes("Unexpected token") || bodyText.includes("is not valid JSON"),
        hasServerPlatformError: bodyText.includes("A server error has occurred")
      };
    });

    if (rawErrors.hasSyntaxError || rawErrors.hasServerPlatformError) {
      throw new Error('Raw syntax or server platform errors found in DOM: ' + JSON.stringify(rawErrors));
    }
    console.log('✓ Step 4: Zero unhandled JSON or syntax errors present in DOM.');

    // Clean up temporary files
    try {
      if (fs.existsSync(oversizedFilePath)) fs.unlinkSync(oversizedFilePath);
      if (fs.existsSync(validFilePath)) fs.unlinkSync(validFilePath);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    } catch (cleanErr) {}

    console.log('\n===============================================================');
    console.log('🎉 MOBILE BROWSER VERIFICATION PASSED PERFECTLY!');
    console.log('===============================================================\n');

  } finally {
    await browser.close();
    server.close();
  }
}

runBrowserTest().catch((err) => {
  console.error('\n❌ MOBILE BROWSER VERIFICATION FAILED:', err);
  process.exit(1);
});
