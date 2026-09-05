const assert = require('assert');
const path = require('path');

async function testEmailModule() {
  console.log('--- 1. Testing Backend Email Configuration ---');
  process.env.EMAIL_USER = 'quotes@apexprinthub.com';
  process.env.EMAIL_PASS = 'mock-test-pass';
  process.env.EMAIL_FROM = 'quotes@apexprinthub.com';
  process.env.EMAIL_REPLY_TO = 'quotes@apexprinthub.com';
  process.env.OWNER_EMAIL = 'quotes@apexprinthub.com';

  const nodemailer = require('../backend/node_modules/nodemailer');
  const sentEmails = [];
  const origCreateTransport = nodemailer.createTransport;
  nodemailer.createTransport = function() {
    return {
      sendMail: async (options) => {
        sentEmails.push(options);
        return { messageId: 'test-msg-12345' };
      }
    };
  };

  delete require.cache[require.resolve('../backend/services/email')];
  const emailService = require('../backend/services/email');
  assert(emailService, 'email.js should load without error');

  const testContactData = {
    name: 'Tariq Al-Mansoor',
    email: 'tariq.mansoor@example.com',
    phone: '+966 50 123 4567',
    country: 'SAR',
    service: 'Luxury Presentation Folders',
    message: 'Need 500 gold-foil embossed folders for Riyadh corporate summit.'
  };

  // Test Customer Confirmation Email
  await emailService.confirmCustomerContact(testContactData);
  assert.strictEqual(sentEmails.length, 1);
  const custEmail = sentEmails[0];
  console.log(`- Customer confirmation TO: ${custEmail.to}`);
  console.log(`- Customer confirmation FROM: ${custEmail.from}`);
  console.log(`- Customer confirmation REPLY-TO: ${custEmail.replyTo}`);
  assert.strictEqual(custEmail.to, 'tariq.mansoor@example.com');
  assert(custEmail.from.includes('quotes@apexprinthub.com'), 'FROM must include quotes@apexprinthub.com');
  assert.strictEqual(custEmail.replyTo, 'quotes@apexprinthub.com');
  assert(custEmail.html.includes('Tariq Al-Mansoor'));
  assert(custEmail.html.includes('+966 50 123 4567'));
  assert(custEmail.html.includes('SAR'));

  // Test Owner Notification Email
  await emailService.notifyOwnerNewContact(testContactData);
  assert.strictEqual(sentEmails.length, 2);
  const ownerEmail = sentEmails[1];
  console.log(`- Owner notification TO: ${ownerEmail.to}`);
  console.log(`- Owner notification FROM: ${ownerEmail.from}`);
  console.log(`- Owner notification REPLY-TO: ${ownerEmail.replyTo}`);
  assert.strictEqual(ownerEmail.to, 'quotes@apexprinthub.com');
  assert(ownerEmail.from.includes('quotes@apexprinthub.com'), 'FROM must include quotes@apexprinthub.com');
  assert.strictEqual(ownerEmail.replyTo, 'tariq.mansoor@example.com');

  // Restore createTransport
  nodemailer.createTransport = origCreateTransport;
  console.log('✅ Email service headers & payloads fully verified for quotes@apexprinthub.com');
}

async function runAll() {
  try {
    await testEmailModule();
    console.log('\n--- 2. Testing Frontend DOM Dial Code Sync in Headless Browser ---');
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const contactUrl = 'file:///' + path.resolve(__dirname, '../contact.html').replace(/\\/g, '/');
    console.log(`Opening: ${contactUrl}`);
    await page.goto(contactUrl);

    // Initial check
    const initialPlaceholder = await page.getAttribute('#phone', 'placeholder');
    console.log(`- Initial phone placeholder: "${initialPlaceholder}"`);
    assert(initialPlaceholder.includes('+971'), 'Initial placeholder should have UAE +971');

    // Test 1: Select Saudi Arabia (+966)
    console.log('\nTest 1: Selecting Saudi Arabia (SAR)...');
    await page.selectOption('#country', 'SAR');
    let phoneVal = await page.inputValue('#phone');
    let placeholder = await page.getAttribute('#phone', 'placeholder');
    console.log(`- Phone value: "${phoneVal}" (Expected: "+966 ")`);
    console.log(`- Phone placeholder: "${placeholder}" (Expected contains "+966")`);
    assert(phoneVal.includes('+966'), 'Phone value must update to +966 on selecting Saudi Arabia');
    assert(placeholder.includes('+966'), 'Placeholder must update to +966');

    // Type digits after +966
    await page.fill('#phone', '+966 50 123 4567');
    console.log('- User typed: "+966 50 123 4567"');

    // Test 2: Select Pakistan (+92) - should dynamically replace dial code preserving digits
    console.log('\nTest 2: Selecting Pakistan (PKR)...');
    await page.selectOption('#country', 'PKR');
    phoneVal = await page.inputValue('#phone');
    placeholder = await page.getAttribute('#phone', 'placeholder');
    console.log(`- Phone value: "${phoneVal}" (Expected: "+92 50 123 4567")`);
    console.log(`- Phone placeholder: "${placeholder}" (Expected contains "+92")`);
    assert(phoneVal.includes('+92 50 123 4567'), 'Phone value must update to +92 while preserving 50 123 4567');
    assert(placeholder.includes('+92'), 'Placeholder must update to +92');

    // Test 3: Select UAE (+971) - should dynamically replace dial code preserving digits
    console.log('\nTest 3: Selecting UAE...');
    await page.selectOption('#country', 'UAE');
    phoneVal = await page.inputValue('#phone');
    console.log(`- Phone value: "${phoneVal}" (Expected: "+971 50 123 4567")`);
    assert(phoneVal.includes('+971 50 123 4567'), 'Phone value must update to +971 while preserving 50 123 4567');

    // Test 4: Focus/click empty phone input sets dial code
    console.log('\nTest 4: Clearing phone and focusing/clicking...');
    await page.fill('#phone', '');
    await page.click('#phone');
    phoneVal = await page.inputValue('#phone');
    console.log(`- Focused phone value: "${phoneVal}" (Expected: "+971 ")`);
    assert(phoneVal.includes('+971'), 'Focusing empty phone should prefill current country dial code');

    // Test 5: Verify Order Form submission structure
    console.log('\nTest 5: Filling full order form with Saudi Arabia details...');
    await page.selectOption('#country', 'SAR');
    await page.fill('#firstName', 'Tariq');
    await page.fill('#lastName', 'Al-Mansoor');
    await page.fill('#email', 'tariq.mansoor@example.com');
    await page.fill('#phone', '+966 50 987 6543');
    await page.selectOption('#service', 'Brochures');
    await page.fill('#message', 'Need 500 gold-foil brochures with luxury embossing.');

    const currentCountry = await page.inputValue('#country');
    const currentPhone = await page.inputValue('#phone');
    console.log(`- Submitting with Country: ${currentCountry}, Phone: ${currentPhone}`);
    assert.strictEqual(currentCountry, 'SAR');
    assert.strictEqual(currentPhone, '+966 50 987 6543');

    await browser.close();
    console.log('\n========================================');
    console.log('✅ ALL VERIFICATION CHECKS PASSED');
    console.log('========================================');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}

runAll();
