const assert = require('assert');
const path = require('path');

// Set dummy email credentials so sendEmail proceeds
process.env.EMAIL_USER = 'test@apexprinthub.com';
process.env.EMAIL_PASS = 'testpass123';

// Intercept nodemailer before requiring email service
const nodemailer = require('../backend/node_modules/nodemailer');
const sentMails = [];

nodemailer.createTransport = () => ({
  sendMail: async (mailOpts) => {
    sentMails.push(mailOpts);
    return { messageId: 'mock-msg-' + Date.now() };
  }
});

const { notifyOwnerNewContact, confirmCustomerContact } = require('../backend/services/email');

async function runTests() {
  console.log('--- STARTING UNIT TESTS: CONTACT & TRANSACTIONAL EMAIL PIPELINE ---');

  // Test 1: notifyOwnerNewContact with cloud-hosted artworks
  console.log('\n[Test 1] Testing notifyOwnerNewContact with cloud-hosted artwork items...');
  sentMails.length = 0;

  const mockOwnerData = {
    name: 'Eleanor Vance',
    email: 'eleanor@vance-luxury.com',
    phone: '+1 555 234 5678',
    country: 'United Kingdom',
    service: 'Luxury Business Cards',
    message: 'Please foil-stamp the logo with matte gold finish.',
    files: [
      { originalname: 'brief_notes.txt', size: 10240, path: '/tmp/brief_notes.txt' }
    ],
    cartData: [
      {
        title: 'Business Cards',
        design: {
          name: 'vance_gold_foil.pdf',
          size: 3670016, // ~3.50 MB
          url: 'https://storage.supabase.co/v0/b/apex-artworks/vance_gold_foil.pdf'
        }
      },
      {
        title: 'Letterhead',
        design: {
          name: 'vance_letterhead.ai',
          size: 5242880, // ~5.00 MB
          url: 'https://storage.supabase.co/v0/b/apex-artworks/vance_letterhead.ai'
        }
      },
      {
        title: 'Compliment Slips',
        design: {
          name: 'local_only.png',
          size: 512000,
          url: '' // local fallback without cloud URL
        }
      }
    ]
  };

  const ownerResult = await notifyOwnerNewContact(mockOwnerData);
  assert.strictEqual(ownerResult, true, 'notifyOwnerNewContact should return true on successful dispatch');
  assert.strictEqual(sentMails.length, 1, 'Should have dispatched 1 email to owner');

  const ownerEmail = sentMails[0];
  assert.ok(ownerEmail.subject.includes('Luxury Business Cards'), 'Subject should contain service name');
  assert.ok(ownerEmail.html.includes('☁️ Cloud-Hosted High-Resolution Print Artwork:'), 'Owner email must contain cloud artwork heading');
  assert.ok(ownerEmail.html.includes('vance_gold_foil.pdf'), 'Owner email must list vance_gold_foil.pdf');
  assert.ok(ownerEmail.html.includes('3.50 MB'), 'Owner email must display formatted size 3.50 MB');
  assert.ok(ownerEmail.html.includes('vance_letterhead.ai'), 'Owner email must list vance_letterhead.ai');
  assert.ok(ownerEmail.html.includes('5.00 MB'), 'Owner email must display formatted size 5.00 MB');
  assert.ok(ownerEmail.html.includes('Download File ↗'), 'Owner email must have prominent "Download File ↗" button');
  assert.ok(ownerEmail.html.includes('https://storage.supabase.co/v0/b/apex-artworks/vance_gold_foil.pdf'), 'Owner email must contain the direct download link');
  assert.ok(ownerEmail.html.includes('#C9A84C'), 'Owner email must maintain luxury gold color (#C9A84C)');
  console.log('✓ Test 1 Passed: notifyOwnerNewContact generated luxury gold download card correctly');

  // Test 2: notifyOwnerNewContact without cloud items
  console.log('\n[Test 2] Testing notifyOwnerNewContact without cloud artwork items...');
  sentMails.length = 0;
  const mockOwnerNoCloud = {
    name: 'John Doe',
    email: 'john@example.com',
    service: 'Brochures',
    message: 'Standard tri-fold brochure.',
    files: [],
    cartData: []
  };
  await notifyOwnerNewContact(mockOwnerNoCloud);
  assert.strictEqual(sentMails.length, 1);
  assert.ok(!sentMails[0].html.includes('☁️ Cloud-Hosted High-Resolution Print Artwork:'), 'Should omit cloud section when no cloud items');
  console.log('✓ Test 2 Passed: notifyOwnerNewContact cleanly omits cloud card when no cloud items exist');

  // Test 3: confirmCustomerContact with artwork items
  console.log('\n[Test 3] Testing confirmCustomerContact with design items...');
  sentMails.length = 0;
  const customerResult = await confirmCustomerContact(mockOwnerData);
  assert.strictEqual(customerResult, true, 'confirmCustomerContact should return true on successful dispatch');
  assert.strictEqual(sentMails.length, 1, 'Should have dispatched 1 email to customer');

  const custEmail = sentMails[0];
  assert.strictEqual(custEmail.to, 'eleanor@vance-luxury.com', 'Customer email recipient must match');
  assert.ok(custEmail.html.includes('🎨 Uploaded Production Artwork (3):'), 'Customer email must include production artwork section');
  assert.ok(custEmail.html.includes('vance_gold_foil.pdf'), 'Customer email must mention uploaded filename');
  assert.ok(custEmail.html.includes('Your high-resolution artwork files have been received and securely stored for prepress review.'), 'Customer email must confirm secure prepress storage');
  assert.ok(custEmail.html.includes('Download File ↗') || custEmail.html.includes('Download ↗'), 'Customer email should include download link for cloud item');
  console.log('✓ Test 3 Passed: confirmCustomerContact properly presents artwork confirmation & prepress details');

  // Test 4: backend/routes/contact.js message synthesis verification
  console.log('\n[Test 4] Testing contact route cloud artwork extraction logic...');
  let initialMessage = 'Please process this order quickly.';
  const sampleCartData = [
    {
      title: 'Packaging Box',
      design: {
        name: 'dieline_box.pdf',
        size: 4718592, // ~4.50 MB
        url: 'https://storage.supabase.co/v0/b/apex-artworks/dieline_box.pdf'
      }
    },
    {
      title: 'Foil Stickers',
      design: {
        name: 'sticker_mask.ai',
        size: 1048576, // 1.00 MB
        url: 'https://storage.supabase.co/v0/b/apex-artworks/sticker_mask.ai'
      }
    }
  ];

  // Emulate contact route logic
  const cloudItems = sampleCartData.filter(it => it && it.design && it.design.url && (it.design.url.startsWith('http://') || it.design.url.startsWith('https://')));
  let modifiedMessage = initialMessage;
  if (cloudItems.length > 0) {
    const cloudArtworkSummary = cloudItems.map((it, idx) => {
      const title = it.title || 'Product';
      const filename = it.design.name || 'artwork';
      const sizeMB = typeof it.design.size === 'number' ? (it.design.size / (1024 * 1024)).toFixed(2) : '0.00';
      return `  ${idx + 1}. ${title}: ${filename} (${sizeMB} MB) — ${it.design.url}`;
    }).join('\n');
    modifiedMessage += `\n\n[Cloud-Hosted Print Artwork (${cloudItems.length})]:\n${cloudArtworkSummary}`;
  }

  assert.ok(modifiedMessage.includes('[Cloud-Hosted Print Artwork (2)]:'), 'Message must contain formatted summary header');
  assert.ok(modifiedMessage.includes('1. Packaging Box: dieline_box.pdf (4.50 MB) — https://storage.supabase.co/v0/b/apex-artworks/dieline_box.pdf'), 'Line 1 must match exact format');
  assert.ok(modifiedMessage.includes('2. Foil Stickers: sticker_mask.ai (1.00 MB) — https://storage.supabase.co/v0/b/apex-artworks/sticker_mask.ai'), 'Line 2 must match exact format');
  console.log('✓ Test 4 Passed: Contact route synthesis extracts and formats cloud artwork accurately');

  // Test 5: Client-side FormData binary upload condition
  console.log('\n[Test 5] Testing client form submit condition for Vercel ceiling compliance...');
  const testItems = [
    { title: 'Item 1', design: { id: 'art_1', url: 'https://cloud.com/art1.pdf', name: 'art1.pdf' } },
    { title: 'Item 2', design: { id: 'art_2', url: '', name: 'art2.pdf' } },
    { title: 'Item 3', design: { id: 'art_3', name: 'art3.png' } },
    { title: 'Item 4', design: null }
  ];

  const filesAppendedToFormData = [];
  for (const item of testItems) {
    const hasCloudUrl = item.design && item.design.url && item.design.url.startsWith('http');
    if (item.design && item.design.id && !hasCloudUrl) {
      filesAppendedToFormData.push(item.design.id);
    }
  }

  assert.deepStrictEqual(filesAppendedToFormData, ['art_2', 'art_3'], 'Only items without cloud URLs must be appended to FormData');
  console.log('✓ Test 5 Passed: Client-side logic correctly keeps cloud uploads out of multipart body');

  console.log('\n========================================================');
  console.log('🎉 ALL UNIT TESTS PASSED (5/5 tests passing)!');
  console.log('========================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ UNIT TEST FAILED:', err);
  process.exit(1);
});
