const assert = require('assert');
const path = require('path');

// Ensure test environment
process.env.NODE_ENV = 'test';
process.env.EMAIL_USER = 'test@apexprinthub.com';
process.env.EMAIL_PASS = 'testpass123';
process.env.MOCK_EMAIL = 'true';

const nodemailer = require('../backend/node_modules/nodemailer');
const addressparser = require('../backend/node_modules/nodemailer/lib/addressparser');
const sentEmails = [];

nodemailer.createTransport = (opts) => ({
  options: opts,
  sendMail: async (mailOpts) => {
    sentEmails.push(mailOpts);
    return { messageId: 'mock-sender-test-' + Date.now() };
  }
});

const {
  resolveSenderAddress,
  resolveReplyToAddress,
  resolveOwnerEmail,
  extractBareEmail,
  extractDisplayName,
  getTransporter,
  notifyOwnerNewContact,
  confirmCustomerContact,
  notifyOwnerNewQuote,
  confirmCustomerQuote
} = require('../backend/services/email');

async function runSenderAddressTests() {
  console.log('========================================================================');
  console.log('?? SENDER ADDRESS & RFC 5322 BRAND IDENTITY VERIFICATION (EXPANDED)');
  console.log('========================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: Default resolveSenderAddress behavior
  // -------------------------------------------------------------
  console.log('[Test 1] Testing resolveSenderAddress() defaults...');
  delete process.env.EMAIL_FROM_ADDRESS;
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_FROM_NAME;

  const defaultSender = resolveSenderAddress();
  console.log(`  Resolved default sender: ${defaultSender}`);
  assert.strictEqual(defaultSender, '"Apex Print Hub" <quotes@apexprinthub.com>');
  console.log('? Test 1 Passed: Default sender is strictly `"Apex Print Hub" <quotes@apexprinthub.com>`\n');

  // -------------------------------------------------------------
  // TEST 2: Bare email address in EMAIL_FROM
  // -------------------------------------------------------------
  console.log('[Test 2] Testing EMAIL_FROM with bare email address...');
  process.env.EMAIL_FROM = 'orders@apexprinthub.com';
  const bareSender = resolveSenderAddress();
  console.log(`  Resolved bare sender: ${bareSender}`);
  assert.strictEqual(bareSender, '"Apex Print Hub" <orders@apexprinthub.com>');
  delete process.env.EMAIL_FROM;
  console.log('? Test 2 Passed: Bare email is cleanly wrapped with brand name\n');

  // -------------------------------------------------------------
  // TEST 3: Pre-formatted EMAIL_FROM_ADDRESS (anti-double-wrapping)
  // -------------------------------------------------------------
  console.log('[Test 3] Testing EMAIL_FROM_ADDRESS pre-formatted string (anti-double-wrapping)...');
  process.env.EMAIL_FROM_ADDRESS = '"Apex Print Hub" <quotes@apexprinthub.com>';
  const preformattedSender = resolveSenderAddress();
  console.log(`  Resolved preformatted: ${preformattedSender}`);
  assert.strictEqual(preformattedSender, '"Apex Print Hub" <quotes@apexprinthub.com>');
  assert.ok(!preformattedSender.includes('""'), 'Must not contain double quotes inside double quotes');
  assert.ok(!preformattedSender.includes('<<'), 'Must not contain double opening angle brackets');
  delete process.env.EMAIL_FROM_ADDRESS;
  console.log('? Test 3 Passed: Pre-formatted address is preserved without double-wrapping\n');

  // -------------------------------------------------------------
  // TEST 4: Angle bracket only address <quotes@apexprinthub.com>
  // -------------------------------------------------------------
  console.log('[Test 4] Testing angle bracket only address `<quotes@apexprinthub.com>`...');
  process.env.EMAIL_FROM_ADDRESS = '<quotes@apexprinthub.com>';
  const angleOnlySender = resolveSenderAddress();
  console.log(`  Resolved angle-only: ${angleOnlySender}`);
  assert.strictEqual(angleOnlySender, '"Apex Print Hub" <quotes@apexprinthub.com>');
  delete process.env.EMAIL_FROM_ADDRESS;
  console.log('? Test 4 Passed: Angle-only address correctly acquires brand name prefix\n');

  // -------------------------------------------------------------
  // TEST 5: Custom BRAND NAME override via EMAIL_FROM_NAME
  // -------------------------------------------------------------
  console.log('[Test 5] Testing custom brand name override via EMAIL_FROM_NAME...');
  process.env.EMAIL_FROM_NAME = 'Apex Print Studio';
  process.env.EMAIL_FROM = 'support@apexprinthub.com';
  const customBrandSender = resolveSenderAddress();
  console.log(`  Resolved custom brand sender: ${customBrandSender}`);
  assert.strictEqual(customBrandSender, '"Apex Print Studio" <support@apexprinthub.com>');
  delete process.env.EMAIL_FROM_NAME;
  delete process.env.EMAIL_FROM;
  console.log('? Test 5 Passed: EMAIL_FROM_NAME cleanly overrides brand display name\n');

  // -------------------------------------------------------------
  // TEST 6: EMAIL_FROM_NAME with literal quotes (anti-double-quote)
  // -------------------------------------------------------------
  console.log('[Test 6] Testing EMAIL_FROM_NAME with literal quotes (anti-double-quote)...');
  process.env.EMAIL_FROM_NAME = '"Apex Print Hub"';
  const quotedBrandSender = resolveSenderAddress('<quotes@apexprinthub.com>');
  console.log(`  Resolved quoted brand sender: ${quotedBrandSender}`);
  assert.strictEqual(quotedBrandSender, '"Apex Print Hub" <quotes@apexprinthub.com>');
  assert.ok(!quotedBrandSender.includes('""'), 'Must NEVER produce double double-quotes');
  delete process.env.EMAIL_FROM_NAME;
  console.log('? Test 6 Passed: Literal quotes stripped cleanly from EMAIL_FROM_NAME\n');

  // -------------------------------------------------------------
  // TEST 7: Outer enclosing quotes (e.g. bash / env var string)
  // -------------------------------------------------------------
  console.log('[Test 7] Testing outer enclosing quotes around candidate...');
  const outerQuotedSender = resolveSenderAddress('"Apex Print Hub <quotes@apexprinthub.com>"');
  console.log(`  Resolved outer-quoted candidate: ${outerQuotedSender}`);
  assert.strictEqual(outerQuotedSender, '"Apex Print Hub" <quotes@apexprinthub.com>');
  console.log('? Test 7 Passed: Outer enclosing quotes stripped and normalized\n');

  // -------------------------------------------------------------
  // TEST 8: Unquoted display name with angle brackets
  // -------------------------------------------------------------
  console.log('[Test 8] Testing unquoted display name `Apex Print Hub <quotes@apexprinthub.com>`...');
  const unquotedNameSender = resolveSenderAddress('Apex Print Hub <quotes@apexprinthub.com>');
  console.log(`  Resolved unquoted display name: ${unquotedNameSender}`);
  assert.strictEqual(unquotedNameSender, '"Apex Print Hub" <quotes@apexprinthub.com>');
  console.log('? Test 8 Passed: Unquoted display name correctly acquires double quotes\n');

  // -------------------------------------------------------------
  // TEST 9: Name-only candidate without email (resilient fallback)
  // -------------------------------------------------------------
  console.log('[Test 9] Testing name-only candidate without email (resilient fallback)...');
  const nameOnlySender = resolveSenderAddress('Apex Print Hub');
  console.log(`  Resolved name-only candidate: ${nameOnlySender}`);
  assert.strictEqual(nameOnlySender, '"Apex Print Hub" <quotes@apexprinthub.com>');
  assert.ok(!nameOnlySender.includes('<Apex Print Hub>'), 'Must NOT generate invalid email <Apex Print Hub>');
  console.log('? Test 9 Passed: Non-email candidate gracefully falls back to default brand email\n');

  // -------------------------------------------------------------
  // TEST 10: Empty / whitespace candidate
  // -------------------------------------------------------------
  console.log('[Test 10] Testing empty and whitespace candidates...');
  assert.strictEqual(resolveSenderAddress(''), '"Apex Print Hub" <quotes@apexprinthub.com>');
  assert.strictEqual(resolveSenderAddress('   '), '"Apex Print Hub" <quotes@apexprinthub.com>');
  assert.strictEqual(resolveSenderAddress(null), '"Apex Print Hub" <quotes@apexprinthub.com>');
  assert.strictEqual(resolveSenderAddress(undefined), '"Apex Print Hub" <quotes@apexprinthub.com>');
  console.log('? Test 10 Passed: Empty/null/undefined cleanly resolve to brand default\n');

  // -------------------------------------------------------------
  // TEST 11: resolveReplyToAddress behavior (always pure bare email)
  // -------------------------------------------------------------
  console.log('[Test 11] Testing resolveReplyToAddress() guarantees bare email...');
  delete process.env.EMAIL_REPLY_TO;
  assert.strictEqual(resolveReplyToAddress(), 'quotes@apexprinthub.com');

  process.env.EMAIL_REPLY_TO = 'replies@apexprinthub.com';
  assert.strictEqual(resolveReplyToAddress(), 'replies@apexprinthub.com');

  // Pre-formatted name-addr in EMAIL_REPLY_TO must be stripped to pure email
  process.env.EMAIL_REPLY_TO = '"Apex Print Hub" <quotes@apexprinthub.com>';
  assert.strictEqual(resolveReplyToAddress(), 'quotes@apexprinthub.com');

  process.env.EMAIL_REPLY_TO = '<quotes@apexprinthub.com>';
  assert.strictEqual(resolveReplyToAddress(), 'quotes@apexprinthub.com');

  assert.strictEqual(resolveReplyToAddress('direct@apexprinthub.com'), 'direct@apexprinthub.com');
  delete process.env.EMAIL_REPLY_TO;
  console.log('? Test 11 Passed: Reply-to address always resolves to clean bare email address\n');

  // -------------------------------------------------------------
  // TEST 12: resolveOwnerEmail behavior
  // -------------------------------------------------------------
  console.log('[Test 12] Testing resolveOwnerEmail()...');
  delete process.env.OWNER_EMAIL;
  assert.strictEqual(resolveOwnerEmail(), 'quotes@apexprinthub.com');

  process.env.OWNER_EMAIL = 'admin@apexprinthub.com';
  assert.strictEqual(resolveOwnerEmail(), 'admin@apexprinthub.com');

  process.env.OWNER_EMAIL = '"Apex Admin" <admin@apexprinthub.com>';
  assert.strictEqual(resolveOwnerEmail(), 'admin@apexprinthub.com');
  delete process.env.OWNER_EMAIL;
  console.log('? Test 12 Passed: Owner email always resolves to clean bare email address\n');

  // -------------------------------------------------------------
  // TEST 13: Email HTML template mailto link safety
  // -------------------------------------------------------------
  console.log('[Test 13] Testing email HTML template mailto link attribute safety...');
  sentEmails.length = 0;
  const sampleOrder = {
    name: 'Sarah Connor',
    email: 'sarah@skyline-prints.com',
    phone: '+971 50 111 2233',
    country: 'UAE',
    service: 'Business Cards',
    message: 'Need matte soft-touch finish with gold foil.',
    cartData: []
  };

  // Even if EMAIL_REPLY_TO had display names, the mailto link must be safe
  process.env.EMAIL_REPLY_TO = '"Apex Print Hub" <quotes@apexprinthub.com>';
  await confirmCustomerContact(sampleOrder);
  assert.strictEqual(sentEmails.length, 1);
  const sentHtml = sentEmails[0].html;

  // Verify href="mailto:quotes@apexprinthub.com" is strictly uncorrupted
  assert.ok(sentHtml.includes('href="mailto:quotes@apexprinthub.com"'), 'HTML must contain valid uncorrupted mailto href');
  assert.ok(!sentHtml.includes('href="mailto:"Apex'), 'HTML must NEVER contain broken mailto:"Apex attribute');
  delete process.env.EMAIL_REPLY_TO;
  console.log('? Test 13 Passed: Email HTML mailto link is completely safe and uncorrupted\n');

  // -------------------------------------------------------------
  // TEST 14: Custom SMTP port 587 STARTTLS vs port 465 SSL
  // -------------------------------------------------------------
  console.log('[Test 14] Testing custom SMTP port 587 STARTTLS vs port 465 SSL in getTransporter()...');
  const origNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  // Port 465 -> secure: true
  process.env.SMTP_HOST = 'mail.apexprinthub.com';
  process.env.SMTP_PORT = '465';
  delete process.env.SMTP_SECURE;
  const t465 = getTransporter();
  assert.strictEqual(t465.options.port, 465);
  assert.strictEqual(t465.options.secure, true, 'Port 465 must default to secure: true (SSL)');

  // Port 587 -> secure: false (STARTTLS)
  process.env.SMTP_PORT = '587';
  const t587 = getTransporter();
  assert.strictEqual(t587.options.port, 587);
  assert.strictEqual(t587.options.secure, false, 'Port 587 must default to secure: false (STARTTLS)');

  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  process.env.NODE_ENV = origNodeEnv;
  console.log('? Test 14 Passed: Port 465 defaults to secure: true and port 587 to secure: false\n');

  // -------------------------------------------------------------
  // TEST 15: Customer order confirmation email headers
  // -------------------------------------------------------------
  console.log('[Test 15] Testing confirmCustomerContact() outbound headers...');
  sentEmails.length = 0;
  await confirmCustomerContact(sampleOrder);
  assert.strictEqual(sentEmails.length, 1);
  const orderCustMail = sentEmails[0];

  console.log(`  Order confirmation From: "${orderCustMail.from}"`);
  console.log(`  Order confirmation Reply-To: "${orderCustMail.replyTo}"`);
  console.log(`  Order confirmation To: "${orderCustMail.to}"`);

  assert.strictEqual(orderCustMail.from, '"Apex Print Hub" <quotes@apexprinthub.com>', 'From header must be exact brand');
  assert.strictEqual(orderCustMail.replyTo, 'quotes@apexprinthub.com', 'Reply-To must be quotes@apexprinthub.com');
  assert.strictEqual(orderCustMail.to, 'sarah@skyline-prints.com', 'To header must be customer email');
  assert.ok(!orderCustMail.from.includes('abdullahhere958@gmail.com'), 'Must NEVER contain personal Gmail in From');
  console.log('? Test 15 Passed: Order confirmation has exact brand From and Reply-To headers\n');

  // -------------------------------------------------------------
  // TEST 16: Store owner order alert email headers
  // -------------------------------------------------------------
  console.log('[Test 16] Testing notifyOwnerNewContact() outbound headers...');
  sentEmails.length = 0;
  await notifyOwnerNewContact(sampleOrder);
  assert.strictEqual(sentEmails.length, 1);
  const orderOwnerMail = sentEmails[0];

  console.log(`  Owner alert From: "${orderOwnerMail.from}"`);
  console.log(`  Owner alert Reply-To: "${orderOwnerMail.replyTo}"`);
  console.log(`  Owner alert To: "${orderOwnerMail.to}"`);

  assert.strictEqual(orderOwnerMail.from, '"Apex Print Hub" <quotes@apexprinthub.com>');
  assert.strictEqual(orderOwnerMail.replyTo, 'sarah@skyline-prints.com', 'Owner alert Reply-To must be customer email');
  assert.strictEqual(orderOwnerMail.to, 'quotes@apexprinthub.com', 'Owner alert To must be owner email');
  console.log('? Test 16 Passed: Owner order alert has brand From and customer Reply-To\n');

  // -------------------------------------------------------------
  // TEST 17: Customer quote confirmation email headers
  // -------------------------------------------------------------
  console.log('[Test 17] Testing confirmCustomerQuote() outbound headers...');
  sentEmails.length = 0;
  const sampleQuote = {
    name: 'Marcus Brody',
    email: 'marcus@museum-curator.org',
    service: 'Brochures',
    quantity: '1000'
  };

  await confirmCustomerQuote(sampleQuote);
  assert.strictEqual(sentEmails.length, 1);
  const quoteCustMail = sentEmails[0];

  console.log(`  Quote confirmation From: "${quoteCustMail.from}"`);
  console.log(`  Quote confirmation Reply-To: "${quoteCustMail.replyTo}"`);

  assert.strictEqual(quoteCustMail.from, '"Apex Print Hub" <quotes@apexprinthub.com>');
  assert.strictEqual(quoteCustMail.replyTo, 'quotes@apexprinthub.com');
  assert.strictEqual(quoteCustMail.to, 'marcus@museum-curator.org');
  assert.ok(!quoteCustMail.from.includes('abdullahhere958@gmail.com'), 'Must NEVER contain personal Gmail in From');
  console.log('? Test 17 Passed: Quote confirmation has exact brand From and Reply-To headers\n');

  // -------------------------------------------------------------
  // TEST 18: Store owner quote alert email headers
  // -------------------------------------------------------------
  console.log('[Test 18] Testing notifyOwnerNewQuote() outbound headers...');
  sentEmails.length = 0;
  await notifyOwnerNewQuote(sampleQuote);
  assert.strictEqual(sentEmails.length, 1);
  const quoteOwnerMail = sentEmails[0];

  console.log(`  Owner quote alert From: "${quoteOwnerMail.from}"`);
  console.log(`  Owner quote alert Reply-To: "${quoteOwnerMail.replyTo}"`);

  assert.strictEqual(quoteOwnerMail.from, '"Apex Print Hub" <quotes@apexprinthub.com>');
  assert.strictEqual(quoteOwnerMail.replyTo, 'marcus@museum-curator.org', 'Owner quote Reply-To must route to customer');
  assert.strictEqual(quoteOwnerMail.to, 'quotes@apexprinthub.com');
  console.log('? Test 18 Passed: Owner quote alert has brand From and customer Reply-To\n');

  // -------------------------------------------------------------
  // TEST 19: Strict RFC 5322 compliance via addressparser
  // -------------------------------------------------------------
  console.log('[Test 19] Testing strict RFC 5322 compliance using addressparser...');
  const resolvedBrand = resolveSenderAddress();
  const parsed = addressparser(resolvedBrand);
  assert.strictEqual(parsed.length, 1, 'Address parser must parse exactly 1 address');
  assert.strictEqual(parsed[0].name, 'Apex Print Hub', 'Display name must be "Apex Print Hub"');
  assert.strictEqual(parsed[0].address, 'quotes@apexprinthub.com', 'Address must be quotes@apexprinthub.com');
  console.log('? Test 19 Passed: addressparser parsed valid mailbox with exact name and address\n');

  console.log('========================================================================');
  console.log('?? ALL 19 SENDER ADDRESS & HEADER VERIFICATION TESTS PASSED!');
  console.log('========================================================================\n');
}

runSenderAddressTests().catch((err) => {
  console.error('\n? TEST SUITE FAILED:', err);
  process.exit(1);
});
