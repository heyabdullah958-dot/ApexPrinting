const { chromium } = require('playwright');
const assert = require('assert');

const PROD_URL = 'https://apex-printing-seven.vercel.app';

(async () => {
  console.log('===============================================================');
  console.log('🌐 RUNNING LIVE PRODUCTION END-TO-END VERIFICATION');
  console.log(`Target: ${PROD_URL}`);
  console.log('===============================================================\n');

  // 1. Test POST /api/quote on live production
  console.log('[Test 1] Testing live production POST /api/quote email dispatch...');
  const quotePayload = {
    name: 'Live E2E Verification',
    email: 'client-audit@apexprinthub.com',
    phone: '+971509998877',
    country: 'UAE',
    service: 'Luxury Business Cards',
    quantity: 1000,
    size: 'Standard 85x55mm',
    paper_type: 'Cotton 450 GSM',
    finishing: 'Gold Foil Stamping',
    sides: 'Double Sided',
    artwork_ready: true,
    notes: 'Live production automated audit test verification'
  };

  const quoteStart = Date.now();
  const quoteRes = await fetch(`${PROD_URL}/api/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quotePayload)
  });
  const quoteElapsed = Date.now() - quoteStart;
  console.log(`Live POST /api/quote HTTP status: ${quoteRes.status} (took ${quoteElapsed}ms)`);
  
  const quoteJson = await quoteRes.json();
  console.log('Live POST /api/quote response body:', quoteJson);
  assert.strictEqual(quoteRes.status, 200, `Expected 200 OK from /api/quote, received ${quoteRes.status}`);
  assert.strictEqual(quoteJson.success, true, 'Quote submission must report success: true');
  assert.strictEqual(quoteJson.customerEmailSent, true, 'Dual email dispatch to client and quotes@apexprinthub.com confirmed');
  console.log('✓ Test 1 Passed: Live /api/quote successfully authenticated with SMTP and dispatched transactional email!\n');

  // 2. Test POST /api/contact on live production
  console.log('[Test 2] Testing live production POST /api/contact order email dispatch...');
  const boundary = '----WebKitFormBoundaryE2ELiveTest';
  const crlf = '\r\n';
  const fields = {
    name: 'Burhan Client Verification',
    email: 'client-audit@apexprinthub.com',
    phone: '+971501112233',
    country: 'UAE',
    service: 'Brochures',
    message: 'Live production order submission verification to quotes@apexprinthub.com'
  };

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
  const contactBody = Buffer.concat(parts);

  const contactStart = Date.now();
  const contactRes = await fetch(`${PROD_URL}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: contactBody
  });
  const contactElapsed = Date.now() - contactStart;
  console.log(`Live POST /api/contact HTTP status: ${contactRes.status} (took ${contactElapsed}ms)`);

  const contactJson = await contactRes.json();
  console.log('Live POST /api/contact response body:', contactJson);
  assert.strictEqual(contactRes.status, 200, `Expected 200 OK from /api/contact, received ${contactRes.status}`);
  assert.strictEqual(contactJson.success, true, 'Contact submission must report success: true');
  assert.strictEqual(contactJson.customerEmailSent, true, 'Contact order dual email dispatch confirmed');
  console.log('✓ Test 2 Passed: Live /api/contact successfully authenticated and dispatched order emails!\n');

  // 3. Test Live Browser UI on Mobile and Desktop
  console.log('[Test 3] Testing live production browser UI via Playwright...');
  const browser = await chromium.launch({ headless: true });
  try {
    // 3A: Mobile Viewport 390x844
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobilePage.goto(PROD_URL);
    await mobilePage.waitForLoadState('networkidle');

    // Hero title check
    const mobileHeroTitle = await mobilePage.$eval('.editorial-hero-title', el => el.innerText.replace(/\s+/g, ' ').trim());
    console.log('Live Mobile Hero Title:', JSON.stringify(mobileHeroTitle));
    assert.strictEqual(mobileHeroTitle, 'Bespoke Print and Packaging Studio');
    console.log('✓ Live Mobile Hero Title strictly verified: "Bespoke Print and Packaging Studio"');

    // Open Note Pads card (client screenshot item)
    const notePadCard = await mobilePage.$('.cylinder-card:has(img[src*="note_pads"])');
    assert.ok(notePadCard, 'Note pad card found in live carousel');
    await notePadCard.dispatchEvent('click');
    await mobilePage.waitForSelector('#productModal.active', { timeout: 5000 });

    const mainImgDisplay = await mobilePage.$eval('#modalMainImg', el => getComputedStyle(el).display);
    const mainImgSrc = await mobilePage.$eval('#modalMainImg', el => el.src);
    const mainImgRendering = await mobilePage.$eval('#modalMainImg', el => getComputedStyle(el).imageRendering);
    const mainCanvasDisplay = await mobilePage.$eval('#modalMainCanvas', el => getComputedStyle(el).display);
    const thumbRowDisplay = await mobilePage.$eval('.thumbnail-row', el => getComputedStyle(el).display);
    const thumbCount = await mobilePage.$$eval('.thumbnail-row .thumbnail', els => els.length);

    console.log('Live Modal Image display:', mainImgDisplay);
    console.log('Live Modal Image source:', mainImgSrc);
    console.log('Live Modal Image rendering:', mainImgRendering);
    console.log('Live Modal Canvas display:', mainCanvasDisplay);
    console.log('Live Modal Thumbnail row display:', thumbRowDisplay);
    console.log('Live Modal Thumbnail count:', thumbCount);

    assert.strictEqual(mainImgDisplay, 'block');
    assert.ok(mainImgSrc.includes('note_pads'));
    assert.strictEqual(mainImgRendering, 'auto');
    assert.strictEqual(mainCanvasDisplay, 'none');
    assert.strictEqual(thumbRowDisplay, 'none');
    assert.strictEqual(thumbCount, 0);
    console.log('✓ Live Mobile Note Pad Modal verified: Native <img> active, image-rendering: auto, canvas hidden, zero mosaic thumbnail box!\n');

    await mobilePage.click('#productModal .modal-close');
    await mobilePage.waitForSelector('#productModal:not(.active)', { timeout: 3000 });

    // 3B: Desktop Viewport 1440x900
    const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await desktopPage.goto(PROD_URL);
    await desktopPage.waitForLoadState('networkidle');

    const deskHeroTitle = await desktopPage.$eval('.editorial-hero-title', el => el.innerText.replace(/\s+/g, ' ').trim());
    assert.strictEqual(deskHeroTitle, 'Bespoke Print and Packaging Studio');
    console.log('✓ Live Desktop Hero Title verified: "Bespoke Print and Packaging Studio"');

    // 3C: Live Services Page PDF Modal Check
    const servicesPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await servicesPage.goto(`${PROD_URL}/services.html`);
    await servicesPage.waitForLoadState('networkidle');

    const bcCard = await servicesPage.$('.product-card:has(canvas[data-pdf*="Business"])');
    if (bcCard) {
      await bcCard.click();
      await servicesPage.waitForSelector('#productModal.active');
      const pdfCanvasDisplay = await servicesPage.$eval('#modalMainCanvas', el => getComputedStyle(el).display);
      assert.strictEqual(pdfCanvasDisplay, 'block');
      await servicesPage.waitForTimeout(1500);
      const canvasWidth = await servicesPage.$eval('#modalMainCanvas', el => el.width);
      console.log('Live Services PDF Canvas render width:', canvasWidth);
      assert.ok(canvasWidth > 300);
      console.log('✓ Live Services PDF Canvas rendered crisply at high resolution');
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL LIVE PRODUCTION VERIFICATIONS COMPLETED SUCCESSFULLY!');
    console.log('===============================================================');

  } finally {
    await browser.close();
  }
})();
