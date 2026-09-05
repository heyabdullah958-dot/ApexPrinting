const http = require('http');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

// 1. Setup mock email transport prior to requiring server/email modules
// This ensures that both direct service calls and API route dispatches capture emails without network SMTP dependencies
process.env.EMAIL_USER = 'test@apexprinthub.com';
process.env.EMAIL_PASS = 'testpassword123';
process.env.NODE_ENV = 'development';

const nodemailer = require('../backend/node_modules/nodemailer');
const sentEmails = [];
nodemailer.createTransport = () => ({
  sendMail: async (mailOpts) => {
    sentEmails.push(mailOpts);
    return { messageId: 'mock-msg-' + Date.now() };
  }
});

const express = require('../backend/node_modules/express');
const { chromium } = require('playwright');
const { notifyOwnerNewContact, confirmCustomerContact } = require('../backend/services/email');

// Tiny 1x1 valid PNG buffer
const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Minimal valid PDF buffer
const MINIMAL_PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n'
);

// Valid 2x2 PNG buffer for swapped image
const SWAPPED_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function runProductionArtworkTestSuite() {
  console.log('================================================================');
  console.log('🚀 APEX PRINT HUB — PRODUCTION ARTWORK FLOW VERIFICATION SUITE');
  console.log('================================================================\n');

  // Directory for test artifacts
  const tempDir = path.join(__dirname, '../temp_production_test_artwork');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const testImgPath = path.join(tempDir, 'sample_logo.png');
  const testPdfPath = path.join(tempDir, 'company_profile.pdf');
  const testSwappedPath = path.join(tempDir, 'swapped_branding.png');

  fs.writeFileSync(testImgPath, TINY_PNG_BUFFER);
  fs.writeFileSync(testPdfPath, MINIMAL_PDF_BUFFER);
  fs.writeFileSync(testSwappedPath, SWAPPED_PNG_BUFFER);
  console.log('✓ Created temporary test artwork assets:');
  console.log('    • PNG Item 1:  ', testImgPath);
  console.log('    • PDF Item 2:  ', testPdfPath);
  console.log('    • Swap Target: ', testSwappedPath);

  // Start static frontend server on port 8000
  const frontendApp = express();
  frontendApp.use(express.static(path.join(__dirname, '..')));
  const frontendServer = await new Promise((resolve) => {
    const s = frontendApp.listen(8000, () => resolve(s));
  });
  console.log('✓ Static frontend server running at http://localhost:8000');

  // Start backend API server on port 3000
  const backendApp = require('../backend/server');
  let backendServer = null;
  try {
    backendServer = await new Promise((resolve, reject) => {
      const s = backendApp.listen(3000, () => resolve(s));
      s.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log('✓ Backend API server already running on port 3000');
          resolve(null);
        } else {
          reject(err);
        }
      });
    });
    if (backendServer) {
      console.log('✓ Backend API server spawned on http://localhost:3000');
    }
  } catch (err) {
    console.log('ℹ️ Backend server notice:', err.message);
  }

  // Launch Playwright Chromium
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Track popups / tabs to ensure NO broken blob: tabs or popup windows occur
  const popupPages = [];
  const popupErrors = [];
  context.on('page', (newPage) => {
    popupPages.push(newPage);
    newPage.on('pageerror', (err) => popupErrors.push(err));
    newPage.on('requestfailed', (req) => {
      popupErrors.push(`Failed URL: ${req.url()} (${req.failure()?.errorText || 'Unknown'})`);
    });
  });

  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('  [Browser Console Error]', msg.text());
  });

  try {
    // -------------------------------------------------------------------------
    // STAGE 1: Services Catalog & Product Modal (PNG Upload)
    // -------------------------------------------------------------------------
    console.log('\n--- STAGE 1: Services Catalog & Product Modal (PNG Upload) ---');
    await page.goto('http://localhost:8000/services.html');
    await page.waitForLoadState('domcontentloaded');

    // Clean initial storage state
    await page.evaluate(async () => {
      localStorage.removeItem('apex_cart');
      if (window.ArtworkStore) await window.ArtworkStore.clear();
    });

    const firstProductCard = page.locator('.product-card').first();
    await firstProductCard.waitFor({ state: 'visible' });
    await firstProductCard.click();

    const productModal = page.locator('#productModal');
    await productModal.waitFor({ state: 'visible' });
    console.log('✓ Product customization modal opened for Item 1');

    // Attach PNG artwork file
    const fileInput = page.locator('#modal_design_file');
    await fileInput.setInputFiles(testImgPath);

    // Verify progress bar appears during upload processing
    const progressBox = page.locator('#modalUploadProgress');
    await progressBox.waitFor({ state: 'visible', timeout: 4000 });
    console.log('✓ Real-time artwork upload progress container (#modalUploadProgress) displayed');

    // Wait for upload completion status
    const completeStatus = page.locator('#modalUploadProgress .artwork-upload-status.complete');
    await completeStatus.waitFor({ state: 'visible', timeout: 5000 });
    const progressText = await page.locator('#modalUploadProgress .artwork-status-text').textContent();
    console.log(`✓ Upload finalized with status: "${progressText.trim()}"`);

    // Verify image preview in modal
    const previewContainer = page.locator('#modal_design_preview_container');
    await previewContainer.waitFor({ state: 'visible' });
    console.log('✓ Modal raster preview container displayed');

    // Submit Item 1 to cart
    const submitBtn = page.locator('#modalSubmitBtn');
    await submitBtn.click();
    await page.waitForTimeout(600);

    // Assert cart state and downsampled previewUrl in localStorage
    const cartAfterItem1 = await page.evaluate(() => JSON.parse(localStorage.getItem('apex_cart') || '[]'));
    assert.strictEqual(cartAfterItem1.length, 1, 'Expected exactly 1 item in cart');
    const item1 = cartAfterItem1[0];
    assert.ok(item1.design && item1.design.id, 'Item 1 must have an artwork ID');
    assert.strictEqual(item1.design.name, 'sample_logo.png', 'Item 1 design name must match');
    assert.ok(item1.design.previewUrl && item1.design.previewUrl.startsWith('data:image/'), 'Item 1 previewUrl must be downsampled Base64 data URL');
    console.log(`✓ Item 1 persisted in localStorage with downsampled thumbnail (${item1.design.previewUrl.length} chars)`);

    // Assert raw binary File is persisted in IndexedDB ArtworkStore
    const item1BinaryExists = await page.evaluate(async (id) => {
      const file = await window.ArtworkStore.get(id);
      return !!file && file.name === 'sample_logo.png' && file.size > 0;
    }, item1.design.id);
    assert.ok(item1BinaryExists, 'Raw binary File for Item 1 must exist inside IndexedDB ArtworkStore');
    console.log('✓ Raw high-resolution binary for Item 1 verified inside IndexedDB ArtworkStore');

    // -------------------------------------------------------------------------
    // STAGE 2: PDF Artwork Attachment (Item 2)
    // -------------------------------------------------------------------------
    console.log('\n--- STAGE 2: Adding Item 2 with PDF Artwork ---');
    const secondProductCard = page.locator('.product-card').nth(1);
    await secondProductCard.click();
    await productModal.waitFor({ state: 'visible' });

    await fileInput.setInputFiles(testPdfPath);
    await completeStatus.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ PDF artwork attached to Item 2');

    await submitBtn.click();
    await page.waitForTimeout(600);

    const cartAfterItem2 = await page.evaluate(() => JSON.parse(localStorage.getItem('apex_cart') || '[]'));
    assert.strictEqual(cartAfterItem2.length, 2, 'Expected exactly 2 items in cart');
    const item2 = cartAfterItem2[1];
    assert.strictEqual(item2.design.name, 'company_profile.pdf', 'Item 2 design name must match');
    
    const item2BinaryExists = await page.evaluate(async (id) => {
      const file = await window.ArtworkStore.get(id);
      return !!file && file.name === 'company_profile.pdf';
    }, item2.design.id);
    assert.ok(item2BinaryExists, 'Raw PDF binary for Item 2 must exist inside IndexedDB');
    console.log('✓ Item 2 stored in cart with PDF attachment record and IndexedDB binary backing');

    // -------------------------------------------------------------------------
    // STAGE 3: Cart Drawer & Luxury In-App Lightbox Verification
    // -------------------------------------------------------------------------
    console.log('\n--- STAGE 3: Cart Drawer & Luxury Lightbox Modal ---');
    await page.evaluate(() => window.openCartModal());
    const cartOverlay = page.locator('#cartOverlay');
    await cartOverlay.waitFor({ state: 'visible' });

    const drawerItems = page.locator('#cartItemsList > div');
    const drawerCount = await drawerItems.count();
    assert.strictEqual(drawerCount, 2, `Expected 2 items rendered in cart drawer, found: ${drawerCount}`);
    console.log('✓ Cart drawer opened and rendering 2 items');

    // Track baseline popup count before clicking artwork
    const baselinePopups = popupPages.length;

    // Click artwork preview for Item 1 (PNG) inside cart drawer
    console.log('  → Clicking Item 1 artwork thumbnail in cart drawer...');
    const item1ArtworkRow = drawerItems.first().locator('div[onclick*="openArtworkLightbox"]');
    await item1ArtworkRow.click();

    // Assert #artworkLightboxModal opens with luxury dark theme
    const lightboxModal = page.locator('#artworkLightboxModal');
    await lightboxModal.waitFor({ state: 'visible', timeout: 3000 });
    console.log('✓ Luxury in-app artwork lightbox modal (#artworkLightboxModal) opened');

    // Assert lightbox header metadata
    const lightboxBadge = page.locator('#lightboxBadge');
    const badgeText = await lightboxBadge.textContent();
    assert.strictEqual(badgeText.trim(), 'PNG', `Expected badge to display 'PNG', got: "${badgeText}"`);

    const lightboxTitle = page.locator('#lightboxTitle');
    const titleText = await lightboxTitle.textContent();
    assert.strictEqual(titleText.trim(), 'sample_logo.png', `Expected title to display 'sample_logo.png', got: "${titleText}"`);

    // Assert image preview is active and document card is hidden
    const lightboxImg = page.locator('#lightboxImg');
    const isImgVisible = await lightboxImg.isVisible();
    assert.ok(isImgVisible, 'High-resolution lightbox image element must be visible for PNG');
    const docCard = page.locator('#lightboxDocCard');
    const isDocVisible = await docCard.isVisible();
    assert.strictEqual(isDocVisible, false, 'Document card must be hidden for PNG artwork');

    // Assert zoom controls are functioning
    const zoomLevelEl = page.locator('#lightboxZoomLevel');
    let currentZoom = await zoomLevelEl.textContent();
    assert.strictEqual(currentZoom.trim(), '100%', 'Initial lightbox zoom must be 100%');

    // Click Zoom In button
    const zoomInBtn = page.locator('.btn-lightbox-zoom[title="Zoom In"]');
    await zoomInBtn.click();
    currentZoom = await zoomLevelEl.textContent();
    assert.strictEqual(currentZoom.trim(), '125%', 'Zoom level should increment to 125%');
    console.log('✓ Lightbox zoom engine verified: +25% increments to 125%');

    // Click Reset Zoom button
    const resetZoomBtn = page.locator('.btn-lightbox-zoom[title="Reset Zoom"]');
    await resetZoomBtn.click();
    currentZoom = await zoomLevelEl.textContent();
    assert.strictEqual(currentZoom.trim(), '100%', 'Reset zoom should return scale to 100%');
    console.log('✓ Lightbox zoom reset verified: returned to 100%');

    // Verify download button is populated
    const downloadBtn = page.locator('#lightboxDownloadBtn');
    const downloadAttr = await downloadBtn.getAttribute('download');
    assert.strictEqual(downloadAttr, 'sample_logo.png', 'Download button attribute must match file name');
    console.log('✓ Download action button configured with original filename');

    // CRITICAL: Assert that NO broken blob: tabs or popup windows occurred
    assert.strictEqual(popupPages.length, baselinePopups, 'Zero external popup tabs should be opened when viewing artwork');
    assert.strictEqual(popupErrors.length, 0, 'Zero popup or ERR_FILE_NOT_FOUND errors allowed');
    console.log('✓ Verified: 0 broken blob tabs or popup errors occurred');

    // Close lightbox using Escape key
    console.log('  → Closing lightbox via Escape key...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const isLightboxClosed = await lightboxModal.evaluate((el) => el.style.display === 'none' || getComputedStyle(el).display === 'none');
    assert.ok(isLightboxClosed, 'Lightbox modal must close on Escape key');
    console.log('✓ Lightbox closed cleanly via Escape key');

    // Also test Item 2 (PDF) in lightbox
    console.log('  → Clicking Item 2 (PDF) artwork pill in cart drawer...');
    const item2ArtworkRow = drawerItems.nth(1).locator('div[onclick*="openArtworkLightbox"]');
    await item2ArtworkRow.click();
    await lightboxModal.waitFor({ state: 'visible', timeout: 3000 });

    const pdfBadgeText = await lightboxBadge.textContent();
    assert.strictEqual(pdfBadgeText.trim(), 'PDF', 'Lightbox badge must read PDF for Item 2');
    const isDocCardVisible = await docCard.isVisible();
    assert.ok(isDocCardVisible, 'Lightbox document card with SVG must be visible for PDF file');
    console.log('✓ PDF vector document card rendered inside lightbox modal');

    // Close lightbox via close button
    const closeBtn = page.locator('.artwork-lightbox-close');
    await closeBtn.click();
    await page.waitForTimeout(300);
    console.log('✓ Lightbox closed cleanly via close button');

    // -------------------------------------------------------------------------
    // STAGE 4: Checkout Navigation
    // -------------------------------------------------------------------------
    console.log('\n--- STAGE 4: Cart Checkout Navigation ---');
    const checkoutBtn = page.locator('#cartCheckoutBtn');
    await Promise.all([
      page.waitForURL(/contact\.html\?service=Custom%20Order/),
      checkoutBtn.click()
    ]);
    console.log('✓ Successfully navigated to contact.html with pre-selected Custom Order service');

    // -------------------------------------------------------------------------
    // STAGE 5: Interactive Checkout Review Panel Inspection
    // -------------------------------------------------------------------------
    console.log('\n--- STAGE 5: Interactive Checkout Order Review Panel ---');
    const reviewPanel = page.locator('#checkoutOrderReview');
    await reviewPanel.waitFor({ state: 'visible', timeout: 5000 });

    const itemCards = reviewPanel.locator('.checkout-item-card');
    const reviewCardCount = await itemCards.count();
    assert.strictEqual(reviewCardCount, 2, 'Checkout review panel must render 2 item cards');

    // Item 1: downsampled thumbnail image
    const card1Img = itemCards.first().locator('.checkout-thumb-img');
    assert.ok(await card1Img.isVisible(), 'Card 1 must display image thumbnail preview');
    const card1Src = await card1Img.getAttribute('src');
    assert.ok(card1Src && card1Src.startsWith('data:image/'), 'Card 1 thumbnail must be valid data URL');

    // Item 2: PDF document badge
    const card2Badge = itemCards.nth(1).locator('.checkout-doc-badge');
    assert.ok(await card2Badge.isVisible(), 'Card 2 must render PDF document badge');
    assert.ok((await card2Badge.textContent()).includes('PDF'), 'Badge must include PDF text');

    // Both cards must render .btn-checkout-swap action buttons
    const swapBtns = reviewPanel.locator('.btn-checkout-swap');
    const swapBtnCount = await swapBtns.count();
    assert.strictEqual(swapBtnCount, 2, 'Each item in review panel must have a .btn-checkout-swap button');
    console.log('✓ Verified both items render visual previews and per-item .btn-checkout-swap action buttons');

    // Verify copy adjustments
    const designFileLabel = page.locator('#designFileLabel');
    assert.ok((await designFileLabel.textContent()).includes('Additional Artwork'), 'Label must invite additional artwork');
    const designFileHint = page.locator('#designFileHint');
    assert.ok(await designFileHint.isVisible(), 'Design file bundle hint must be visible');
    console.log('✓ Dynamic artwork bundling helper copy displayed on contact form');

    // -------------------------------------------------------------------------
    // STAGE 6: Per-Item Artwork Swap Directly on Checkout Screen
    // -------------------------------------------------------------------------
    console.log('\n--- STAGE 6: Testing Per-Item Artwork Swap on Checkout Review ---');
    const oldItem2Id = item2.design.id;

    // Trigger artwork swap for Item 2 using Playwright filechooser listener
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      itemCards.nth(1).locator('.btn-checkout-swap').click()
    ]);
    console.log('  → File chooser intercepted, selecting swapped_branding.png...');
    await fileChooser.setFiles(testSwappedPath);

    // Assert toast notification appears for swap completion
    const toast = page.locator('.apex-toast').filter({ hasText: 'Artwork updated to' });
    await toast.waitFor({ state: 'visible', timeout: 7000 });
    const toastContent = await toast.textContent();
    assert.ok(toastContent.includes('swapped_branding.png'), `Toast should confirm swap, got: "${toastContent}"`);
    console.log(`✓ Reactive toast notification displayed: "${toastContent.trim()}"`);

    // Assert live DOM updates without full page reload
    const updatedCard2 = itemCards.nth(1);
    const card2Status = updatedCard2.locator('.checkout-artwork-status');
    await card2Status.waitFor({ state: 'visible' });
    const card2StatusText = await card2Status.textContent();
    assert.ok(card2StatusText.includes('swapped_branding.png'), `Card 2 status must update to swapped file: "${card2StatusText}"`);

    // Because the swapped file is a PNG, Card 2 should now render .checkout-thumb-img instead of PDF badge
    const card2NewImg = updatedCard2.locator('.checkout-thumb-img');
    await card2NewImg.waitFor({ state: 'visible', timeout: 3000 });
    console.log('✓ Live DOM updated: Item 2 converted from PDF badge to raster image thumbnail');

    // Assert reactive localStorage update
    const cartAfterSwap = await page.evaluate(() => JSON.parse(localStorage.getItem('apex_cart') || '[]'));
    const swappedItem = cartAfterSwap[1];
    assert.strictEqual(swappedItem.design.name, 'swapped_branding.png', 'localStorage item 2 design name must update');
    assert.ok(swappedItem.design.previewUrl.startsWith('data:image/'), 'localStorage item 2 must have image previewUrl');
    assert.notStrictEqual(swappedItem.design.id, oldItem2Id, 'New artwork ID must be generated');
    console.log('✓ Reactive update verified in localStorage: new design ID and metadata stored');

    // Assert reactive IndexedDB update (old file cleaned, new file stored)
    const newFileInDb = await page.evaluate(async (id) => {
      const file = await window.ArtworkStore.get(id);
      return !!file && file.name === 'swapped_branding.png';
    }, swappedItem.design.id);
    assert.ok(newFileInDb, 'Swapped binary File must be stored in IndexedDB');

    const oldFilePurgedFromDb = await page.evaluate(async (id) => {
      const file = await window.ArtworkStore.get(id);
      return !file;
    }, oldItem2Id);
    assert.ok(oldFilePurgedFromDb, 'Previous unlinked artwork file must be purged from IndexedDB to prevent cache leaks');
    console.log('✓ Reactive update verified in IndexedDB ArtworkStore: new binary stored, orphaned file purged');

    // -------------------------------------------------------------------------
    // STAGE 7: Contact Form Submission & Vercel Payload Protection
    // -------------------------------------------------------------------------
    console.log('\n--- STAGE 7: Form Submission & Vercel Payload Protection ---');
    await page.fill('#firstName', 'Alexander');
    await page.fill('#lastName', 'Wright');
    await page.fill('#email', 'alex.wright@example.com');
    await page.fill('#phone', '+971 50 987 6543');

    // Submit form and assert HTTP 200 from /api/contact
    const [contactResponse] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/contact')),
      page.locator('#contactForm button[type="submit"]').click()
    ]);

    assert.strictEqual(contactResponse.status(), 200, `Expected HTTP 200 from /api/contact, got: ${contactResponse.status()}`);
    console.log('✓ Order submission request succeeded with HTTP 200 OK');

    // Assert success banner displayed
    const formSuccess = page.locator('#formSuccess');
    await formSuccess.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Form success confirmation banner displayed on screen');

    // -------------------------------------------------------------------------
    // STAGE 8: Post-Submission Storage & Cache Purge Verification
    // -------------------------------------------------------------------------
    console.log('\n--- STAGE 8: Post-Submission Storage & Cache Purge Verification ---');
    const cartPostSubmit = await page.evaluate(() => localStorage.getItem('apex_cart'));
    assert.ok(cartPostSubmit === '[]' || cartPostSubmit === null, `Cart in localStorage must be reset, got: ${cartPostSubmit}`);
    console.log('✓ Cart in localStorage successfully reset to empty array');

    const isIndexedDbCleared = await page.evaluate(async (ids) => {
      for (const id of ids) {
        const file = await window.ArtworkStore.get(id);
        if (file) return false;
      }
      return true;
    }, [item1.design.id, swappedItem.design.id]);
    assert.ok(isIndexedDbCleared, 'All order artwork files in IndexedDB ArtworkStore must be purged post-submission');
    console.log('✓ IndexedDB ArtworkStore successfully purged post-submission');

    // -------------------------------------------------------------------------
    // STAGE 9: Backend Email Notification Verification
    // -------------------------------------------------------------------------
    console.log('\n--- STAGE 9: Backend Email Notification & Gold Download Buttons ---');

    // Test notifyOwnerNewContact with cloud-hosted artworks
    const mockCloudOrder = {
      name: 'Alexander Wright',
      email: 'alex.wright@example.com',
      phone: '+971 50 987 6543',
      country: 'UAE',
      service: 'Custom Order',
      message: 'Urgent turnaround required for corporate gala.',
      files: [],
      cartData: [
        {
          title: 'Custom Foil Business Cards',
          design: {
            name: 'executive_crest.pdf',
            size: 4718592, // 4.50 MB
            url: 'https://xyzcompany.supabase.co/storage/v1/object/public/order-artworks/orders/crest.pdf'
          }
        },
        {
          title: 'Rigid Presentation Boxes',
          design: {
            name: 'box_dieline.ai',
            size: 8388608, // 8.00 MB
            url: 'https://xyzcompany.supabase.co/storage/v1/object/public/order-artworks/orders/box_dieline.ai'
          }
        }
      ]
    };

    sentEmails.length = 0;
    const ownerEmailSuccess = await notifyOwnerNewContact(mockCloudOrder);
    assert.strictEqual(ownerEmailSuccess, true, 'notifyOwnerNewContact should succeed');
    assert.strictEqual(sentEmails.length, 1, 'Should have dispatched 1 email to store owner');

    const ownerEmail = sentEmails[0];
    assert.ok(ownerEmail.html.includes('☁️ Cloud-Hosted High-Resolution Print Artwork:'), 'Must contain cloud artwork section');
    assert.ok(ownerEmail.html.includes('executive_crest.pdf'), 'Must list executive_crest.pdf');
    assert.ok(ownerEmail.html.includes('4.50 MB'), 'Must list 4.50 MB formatted size');
    assert.ok(ownerEmail.html.includes('box_dieline.ai'), 'Must list box_dieline.ai');
    assert.ok(ownerEmail.html.includes('8.00 MB'), 'Must list 8.00 MB formatted size');
    assert.ok(ownerEmail.html.includes('Download File ↗'), 'Must contain "Download File ↗" CTA');
    assert.ok(ownerEmail.html.includes('#C9A84C'), 'Must feature luxury brand gold styling (#C9A84C)');
    assert.ok(ownerEmail.html.includes('https://xyzcompany.supabase.co/storage/v1/object/public/order-artworks/orders/crest.pdf'), 'Must contain public CDN URL');
    console.log('✓ Owner email HTML verified: includes cloud artwork table with luxury gold download buttons');

    // Test confirmCustomerContact with uploaded artwork items
    sentEmails.length = 0;
    const customerEmailSuccess = await confirmCustomerContact(mockCloudOrder);
    assert.strictEqual(customerEmailSuccess, true, 'confirmCustomerContact should succeed');
    assert.strictEqual(sentEmails.length, 1, 'Should have dispatched 1 email to customer');

    const custEmail = sentEmails[0];
    assert.strictEqual(custEmail.to, 'alex.wright@example.com', 'Customer email recipient must match');
    assert.ok(custEmail.html.includes('🎨 Uploaded Production Artwork'), 'Customer email must include production artwork section');
    assert.ok(custEmail.html.includes('Your high-resolution artwork files have been received and securely stored for prepress review.'), 'Must reassure customer regarding prepress review');
    assert.ok(custEmail.html.includes('Download File ↗') || custEmail.html.includes('Download ↗'), 'Must provide proof download links');
    console.log('✓ Customer confirmation email verified: confirms prepress storage and provides proof access');

    console.log('\n================================================================');
    console.log('🎉 ALL 9 STAGES PASSED: 100% PRODUCTION VERIFICATION COMPLETE!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ PRODUCTION TEST SUITE FAILED:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    if (frontendServer) frontendServer.close();
    if (backendServer) backendServer.close();
    try {
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
    process.exit(process.exitCode || 0);
  }
}

runProductionArtworkTestSuite();
