const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');
const http = require('http');
const fs = require('fs');

// Simple static file server for local testing
function startStaticServer(port) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.pdf': 'application/pdf',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';
    const filePath = path.join(__dirname, '..', decodeURIComponent(reqUrl));
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });

  return new Promise(resolve => {
    server.listen(port, () => resolve(server));
  });
}

(async () => {
  console.log('=== RUNNING BROWSER & MODAL PIXELATION VERIFICATION ===');
  const port = 8089;
  const staticServer = await startStaticServer(port);
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Mobile viewport test (390 x 844) - reproduces the user's uploaded mobile screenshot
    console.log('\n[Phase A: Mobile Viewport 390x844 Testing]');
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobilePage.goto(`http://localhost:${port}/index.html`);
    await mobilePage.waitForLoadState('networkidle');

    // A1: Check Hero Title Text
    const heroTitle = await mobilePage.$eval('.editorial-hero-title', el => el.innerText.replace(/\s+/g, ' ').trim());
    console.log('Mobile Hero Title:', JSON.stringify(heroTitle));
    assert.strictEqual(heroTitle, 'Bespoke Print and Packaging Studio', 'Hero title must strictly match');
    console.log('✓ Hero title matches "Bespoke Print and Packaging Studio"');

    // A2: Click Note Pads card (exact item from client screenshot)
    console.log('Testing modal opening for Custom Promotional Note Pads...');
    const notePadCard = await mobilePage.$('.cylinder-card:has(img[src*="note_pads"])');
    assert.ok(notePadCard, 'Note pad card must exist in carousel');
    await notePadCard.dispatchEvent('click');

    await mobilePage.waitForSelector('#productModal.active', { timeout: 5000 });
    
    // Check main image
    const mainImgDisplay = await mobilePage.$eval('#modalMainImg', el => getComputedStyle(el).display);
    const mainImgSrc = await mobilePage.$eval('#modalMainImg', el => el.src);
    const mainImgRendering = await mobilePage.$eval('#modalMainImg', el => getComputedStyle(el).imageRendering);
    const mainCanvasDisplay = await mobilePage.$eval('#modalMainCanvas', el => getComputedStyle(el).display);
    const thumbnailRowDisplay = await mobilePage.$eval('.thumbnail-row', el => getComputedStyle(el).display);
    const thumbnailCount = await mobilePage.$$eval('.thumbnail-row .thumbnail', els => els.length);

    console.log('Modal Main Img display:', mainImgDisplay);
    console.log('Modal Main Img src:', mainImgSrc);
    console.log('Modal Main Img image-rendering:', mainImgRendering);
    console.log('Modal Main Canvas display:', mainCanvasDisplay);
    console.log('Modal Thumbnail Row display:', thumbnailRowDisplay);
    console.log('Modal Thumbnail count:', thumbnailCount);

    assert.strictEqual(mainImgDisplay, 'block', 'Raster product must use native <img>');
    assert.ok(mainImgSrc.includes('note_pads'), 'Image src must be note_pads');
    assert.strictEqual(mainImgRendering, 'auto', 'image-rendering must be auto (not -webkit-optimize-contrast)');
    assert.strictEqual(mainCanvasDisplay, 'none', 'Canvas must be hidden for raster images');
    assert.strictEqual(thumbnailRowDisplay, 'none', 'Thumbnail row must be completely hidden for single items');
    assert.strictEqual(thumbnailCount, 0, 'No dummy mosaic thumbnails should exist');
    console.log('✓ Verified: Native <img> is active, crisp auto rendering, canvas is hidden, thumbnail row is hidden (no mosaic glitch)');

    // Close modal
    await mobilePage.click('#productModal .modal-close');
    await mobilePage.waitForSelector('#productModal:not(.active)', { timeout: 3000 });
    console.log('✓ Modal closed cleanly');

    // 2. Desktop viewport test (1440 x 900)
    console.log('\n[Phase B: Desktop Viewport 1440x900 Testing]');
    const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await desktopPage.goto(`http://localhost:${port}/index.html`);
    await desktopPage.waitForLoadState('networkidle');

    const deskHeroTitle = await desktopPage.$eval('.editorial-hero-title', el => el.innerText.replace(/\s+/g, ' ').trim());
    assert.strictEqual(deskHeroTitle, 'Bespoke Print and Packaging Studio');
    console.log('✓ Desktop hero title verified');

    // Test clicking another product (Gift Boxes)
    const giftBoxCard = await desktopPage.$('.cylinder-card:has(img[src*="gift_boxes"])');
    await giftBoxCard.dispatchEvent('click');
    await desktopPage.waitForSelector('#productModal.active');

    const deskImgDisplay = await desktopPage.$eval('#modalMainImg', el => getComputedStyle(el).display);
    const deskThumbDisplay = await desktopPage.$eval('.thumbnail-row', el => getComputedStyle(el).display);
    assert.strictEqual(deskImgDisplay, 'block');
    assert.strictEqual(deskThumbDisplay, 'none');
    console.log('✓ Desktop raster modal verified: crisp native image, hidden thumbnail row');

    await desktopPage.click('#productModal .modal-close');

    // 3. Services page test (PDF documents)
    console.log('\n[Phase C: Services Page PDF Product Modal Testing]');
    const servicesPage = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    await servicesPage.goto(`http://localhost:${port}/services.html`);
    await servicesPage.waitForLoadState('networkidle');

    // Click Business Card product card
    const bcCard = await servicesPage.$('.product-card:has(canvas[data-pdf*="Business"])');
    if (bcCard) {
      console.log('Opening Business Card PDF modal...');
      await bcCard.click();
      await servicesPage.waitForSelector('#productModal.active');
      
      const pdfCanvasDisplay = await servicesPage.$eval('#modalMainCanvas', el => getComputedStyle(el).display);
      const pdfImgDisplay = await servicesPage.$eval('#modalMainImg', el => getComputedStyle(el).display);
      assert.strictEqual(pdfCanvasDisplay, 'block', 'Canvas must be displayed for PDF');
      assert.strictEqual(pdfImgDisplay, 'none', 'Image must be hidden for PDF');
      console.log('✓ Services page PDF modal opened with canvas active and img hidden');

      // Wait 1s for PDF.js to finish
      await servicesPage.waitForTimeout(1000);
      const canvasWidth = await servicesPage.$eval('#modalMainCanvas', el => el.width);
      console.log('PDF Canvas render width:', canvasWidth);
      assert.ok(canvasWidth > 300, 'Canvas must render at high resolution (>300px)');
      console.log('✓ High-DPI PDF render verified');
      await servicesPage.click('#productModal .modal-close');
    }

    console.log('\n========================================================');
    console.log('🎉 ALL BROWSER & MODAL PIXELATION TESTS PASSED!');
    console.log('========================================================');

  } finally {
    await browser.close();
    staticServer.close();
  }
})();
