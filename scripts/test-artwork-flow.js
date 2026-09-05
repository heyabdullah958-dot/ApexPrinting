const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('../backend/node_modules/express');
const { chromium } = require('playwright');

// Tiny 1x1 valid PNG buffer
const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Minimal valid PDF buffer
const MINIMAL_PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n'
);

async function runTest() {
  console.log('--- STARTING ARTWORK FLOW AUTOMATED VERIFICATION ---');

  // 1. Create temporary test files
  const tempDir = path.join(__dirname, '../temp_test_artwork');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const testImgPath = path.join(tempDir, 'sample_logo.png');
  const testPdfPath = path.join(tempDir, 'company_profile.pdf');
  fs.writeFileSync(testImgPath, TINY_PNG_BUFFER);
  fs.writeFileSync(testPdfPath, MINIMAL_PDF_BUFFER);
  console.log('✓ Temporary test artwork files created:', testImgPath, testPdfPath);

  // 2. Start static frontend server on port 8000
  const frontendApp = express();
  frontendApp.use(express.static(path.join(__dirname, '..')));
  const frontendServer = await new Promise((resolve) => {
    const s = frontendApp.listen(8000, () => resolve(s));
  });
  console.log('✓ Frontend static server running on http://localhost:8000');

  // 3. Start backend API server on port 3000
  const backendApp = require('../backend/server');
  let backendServer = null;
  try {
    backendServer = await new Promise((resolve, reject) => {
      const s = backendApp.listen(3000, () => resolve(s));
      s.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log('✓ Backend already listening on port 3000');
          resolve(null);
        } else {
          reject(err);
        }
      });
    });
  } catch (err) {
    console.log('Backend listen note:', err.message);
  }

  // 4. Launch Playwright
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[Browser Error]', msg.text());
  });

  try {
    // 5. Navigate to services.html
    console.log('\nStep 1: Navigating to services catalog (services.html)...');
    await page.goto('http://localhost:8000/services.html');
    await page.waitForLoadState('domcontentloaded');

    // Clear any previous cart state
    await page.evaluate(async () => {
      localStorage.removeItem('apex_cart');
      if (window.ArtworkStore) await window.ArtworkStore.clear();
    });

    // 6. Click on first product card to open customization modal
    console.log('Step 2: Opening product modal for Item 1...');
    const firstProductCard = page.locator('.product-card').first();
    await firstProductCard.waitFor({ state: 'visible' });
    await firstProductCard.click();

    const productModal = page.locator('#productModal');
    await productModal.waitFor({ state: 'visible' });
    console.log('✓ Product modal opened');

    // 7. Upload PNG artwork file
    console.log('Step 3: Attaching PNG artwork to Item 1...');
    const fileInput = page.locator('#modal_design_file');
    await fileInput.setInputFiles(testImgPath);

    // Verify modal image preview
    const previewContainer = page.locator('#modal_design_preview_container');
    await previewContainer.waitFor({ state: 'visible', timeout: 3000 });
    console.log('✓ Modal design preview displayed for PNG');

    // 8. Add Item 1 to cart
    console.log('Step 4: Clicking "Add to Order Request →"...');
    const submitBtn = page.locator('#modalSubmitBtn');
    await submitBtn.click();
    await page.waitForTimeout(500);

    // Verify item in cart
    const cartItems = await page.evaluate(() => JSON.parse(localStorage.getItem('apex_cart') || '[]'));
    if (cartItems.length !== 1) throw new Error(`Expected 1 cart item, found: ${cartItems.length}`);
    const item1 = cartItems[0];
    if (!item1.design || !item1.design.id || !item1.design.previewUrl) {
      throw new Error(`Item 1 design missing persistence properties: ${JSON.stringify(item1.design)}`);
    }
    console.log(`✓ Item 1 stored in cart with thumbnail data URL (size: ${item1.design.previewUrl.length} chars)`);

    // Verify file exists in IndexedDB
    const dbHasItem1 = await page.evaluate(async (id) => {
      const file = await window.ArtworkStore.get(id);
      return !!file && file.name === 'sample_logo.png';
    }, item1.design.id);
    if (!dbHasItem1) throw new Error('Item 1 raw file not found in IndexedDB ArtworkStore');
    console.log('✓ Item 1 raw binary File verified inside IndexedDB');

    // 9. Add Item 2 with PDF artwork
    console.log('\nStep 5: Opening product modal for Item 2...');
    const secondProductCard = page.locator('.product-card').nth(1);
    await secondProductCard.click();
    await productModal.waitFor({ state: 'visible' });

    console.log('Step 6: Attaching PDF artwork to Item 2...');
    await fileInput.setInputFiles(testPdfPath);
    await page.waitForTimeout(300);

    console.log('Step 7: Adding Item 2 to Order Request...');
    await submitBtn.click();
    await page.waitForTimeout(500);

    const cartItemsAfter2 = await page.evaluate(() => JSON.parse(localStorage.getItem('apex_cart') || '[]'));
    if (cartItemsAfter2.length !== 2) throw new Error(`Expected 2 cart items, found: ${cartItemsAfter2.length}`);
    const item2 = cartItemsAfter2[1];
    if (!item2.design || !item2.design.id || item2.design.name !== 'company_profile.pdf') {
      throw new Error(`Item 2 design missing or incorrect: ${JSON.stringify(item2.design)}`);
    }
    console.log('✓ Item 2 stored in cart with PDF attachment record');

    // 10. Open Cart Drawer and verify visual thumbnails
    console.log('\nStep 8: Opening cart drawer and inspecting items...');
    await page.evaluate(() => window.openCartModal());
    const cartOverlay = page.locator('#cartOverlay');
    await cartOverlay.waitFor({ state: 'visible' });

    const drawerCartItems = page.locator('#cartItemsList > div');
    const countInDrawer = await drawerCartItems.count();
    if (countInDrawer !== 2) throw new Error(`Expected 2 items in cart drawer, found: ${countInDrawer}`);
    console.log(`✓ Cart drawer renders ${countInDrawer} items`);

    // 11. Trigger checkout navigation
    console.log('\nStep 9: Clicking "Submit Order Request →" in cart drawer...');
    const checkoutBtn = page.locator('#cartCheckoutBtn');
    await Promise.all([
      page.waitForURL(/contact\.html\?service=Custom%20Order/),
      checkoutBtn.click()
    ]);
    console.log('✓ Successfully navigated to contact.html via checkoutCart()');

    // 12. Verify Checkout Order Review Panel on contact.html
    console.log('\nStep 10: Inspecting checkout review panel on contact.html...');
    const reviewPanel = page.locator('#checkoutOrderReview');
    await reviewPanel.waitFor({ state: 'visible', timeout: 5000 });

    const itemCards = reviewPanel.locator('.checkout-item-card');
    const cardCount = await itemCards.count();
    if (cardCount !== 2) throw new Error(`Expected 2 item cards in review panel, found: ${cardCount}`);
    console.log(`✓ Checkout review panel rendered ${cardCount} item cards`);

    // Check Card 1: thumbnail image
    const card1Img = itemCards.first().locator('.checkout-thumb-img');
    const hasCard1Img = await card1Img.isVisible();
    const card1ImgSrc = await card1Img.getAttribute('src');
    if (!hasCard1Img || !card1ImgSrc || !card1ImgSrc.startsWith('data:image/')) {
      throw new Error('Item 1 in checkout review panel does not render valid Base64 thumbnail image');
    }
    console.log('✓ Card 1 renders visual image thumbnail preview from persisted data URL');

    // Check Card 2: PDF badge
    const card2Badge = itemCards.nth(1).locator('.checkout-doc-badge');
    const hasCard2Badge = await card2Badge.isVisible();
    const card2BadgeText = await card2Badge.textContent();
    if (!hasCard2Badge || !card2BadgeText.includes('PDF')) {
      throw new Error(`Item 2 does not render PDF document badge: ${card2BadgeText}`);
    }
    console.log('✓ Card 2 renders PDF document badge');

    // Check hint and upload label
    const designLabel = page.locator('#designFileLabel');
    const labelText = await designLabel.textContent();
    if (!labelText.includes('Additional Artwork')) {
      throw new Error(`Expected label to mention Additional Artwork, got: "${labelText}"`);
    }
    console.log('✓ Label dynamically adjusted to "Upload Additional Artwork / Master Files (Optional)"');

    const designHint = page.locator('#designFileHint');
    const hintVisible = await designHint.isVisible();
    if (!hintVisible) throw new Error('Expected designFileHint to be visible for cart items');
    console.log('✓ Helper hint informs customer that item artwork is bundled automatically');

    // 13. Fill and submit contact form
    console.log('\nStep 11: Submitting complete order request with multi-file payload...');
    await page.fill('#firstName', 'Alexander');
    await page.fill('#lastName', 'Wright');
    await page.fill('#email', 'alex.wright@example.com');
    await page.fill('#phone', '+971 50 987 6543');

    const submitContactBtn = page.locator('#contactForm button[type="submit"]');
    await submitContactBtn.click();

    // Verify success confirmation
    const formSuccess = page.locator('#formSuccess');
    await formSuccess.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Form submitted successfully! Form success message displayed');

    // 14. Verify cart and IndexedDB are purged
    const cartAfterSubmit = await page.evaluate(() => JSON.parse(localStorage.getItem('apex_cart') || '[]'));
    if (cartAfterSubmit.length !== 0) throw new Error(`Cart was not cleared after submit: ${cartAfterSubmit.length}`);
    console.log('✓ Cart in localStorage successfully reset to empty array');

    const dbEmptyAfterSubmit = await page.evaluate(async (id) => {
      const file = await window.ArtworkStore.get(id);
      return !file;
    }, item1.design.id);
    if (!dbEmptyAfterSubmit) throw new Error('IndexedDB artwork was not purged after submit');
    console.log('✓ IndexedDB artwork cache purged after successful submission');

    console.log('\n========================================================');
    console.log('🎉 ALL ARTWORK FLOW VERIFICATION TESTS PASSED (100%)!');
    console.log('========================================================\n');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
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

runTest();
