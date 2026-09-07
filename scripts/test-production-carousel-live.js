const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
    console.log('================================================================');
    console.log('🚀 TESTING LIVE VERCEL PRODUCTION: 3D CAROUSEL & SHOP NOW');
    console.log('   URL: https://apex-printing-seven.vercel.app');
    console.log('================================================================\n');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

    let pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err));
    page.on('console', msg => {
        if (msg.type() === 'error') console.error('  [Live Console Error]:', msg.text());
    });

    await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
    const response = await page.goto('https://apex-printing-seven.vercel.app', { waitUntil: 'networkidle' });
    console.log(`- Live HTTP Status: ${response.status()}`);
    assert.strictEqual(response.status(), 200, 'Live landing page must return HTTP 200');

    // 1. Check Hero Copy
    const heroTitle = await page.$eval('.editorial-hero-title', el => el.innerText.replace(/\s+/g, ' ').trim());
    console.log(`- Live Hero Title: "${heroTitle}"`);
    assert.strictEqual(heroTitle, 'Bespoke Print and Packaging Studio', 'Live hero title must match');

    // 2. Check 16 Cards & 16 Shop Now buttons
    const cardsCount = await page.$$eval('.cylinder-card', els => els.length);
    const buttonsCount = await page.$$eval('.cylinder-card-btn', els => els.length);
    console.log(`- Live Cards: ${cardsCount} (expected 16)`);
    console.log(`- Live Shop Now Buttons: ${buttonsCount} (expected 16)`);
    assert.strictEqual(cardsCount, 16, 'Live site must have 16 cards');
    assert.strictEqual(buttonsCount, 16, 'Live site must have 16 Shop Now buttons');

    // 3. Hover & Click Shop Now button on live site
    const firstBtn = await page.$('.cylinder-card:first-child .cylinder-card-btn');
    const btnBox = await firstBtn.boundingBox();
    assert(btnBox, 'Live first button must have bounding box');

    console.log('- Hovering over live "Shop Now" button...');
    await page.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
    await page.waitForTimeout(300);

    console.log('- Clicking live "Shop Now" button...');
    await page.mouse.click(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
    await page.waitForTimeout(800);

    let isModalActive = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    let modalTitle = await page.evaluate(() => document.getElementById('modalTitle').textContent.trim());
    console.log(`- Live Modal Active: ${isModalActive}`);
    console.log(`- Live Modal Title: "${modalTitle}"`);
    assert.strictEqual(isModalActive, true, 'Live modal must open on "Shop Now" click');
    assert(modalTitle.includes('Business Card'), 'Modal title must be Luxury Business Cards');

    // 4. Close modal cleanly
    console.log('- Closing live modal...');
    await page.click('#productModal .modal-close');
    await page.waitForTimeout(400);
    isModalActive = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    assert.strictEqual(isModalActive, false, 'Live modal must close cleanly');

    // 5. Test Live Drag & Swipe gesture
    console.log('- Testing live drag & swipe interaction...');
    const viewport = await page.$('#cylinderCarouselViewport');
    const vpBox = await viewport.boundingBox();
    const startX = vpBox.x + vpBox.width / 2;
    const startY = vpBox.y + vpBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 200, startY, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    isModalActive = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    console.log(`- Live Modal Active after dragging: ${isModalActive} (Expected: false)`);
    assert.strictEqual(isModalActive, false, 'Drag gesture must NOT open modal on live site');

    // 6. Test Mobile Viewport on live site
    console.log('\n- Testing live mobile viewport (390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Verify button is not hidden by CSS display: none on mobile
    const displayStyle = await page.$eval('.cylinder-card-btn', el => window.getComputedStyle(el).display);
    console.log(`- Live Mobile Shop Now CSS Display: "${displayStyle}"`);
    assert(displayStyle === 'flex' || displayStyle === 'inline-flex', 'Shop Now button must remain visible on mobile');

    // Find the front-facing card closest to viewport center
    const frontCardInfo = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.cylinder-card'));
        const centerX = window.innerWidth / 2;
        let closest = null;
        let closestDist = Infinity;
        cards.forEach(c => {
            const rect = c.getBoundingClientRect();
            const mid = rect.x + rect.width / 2;
            const dist = Math.abs(mid - centerX);
            if (dist < closestDist && window.getComputedStyle(c).visibility !== 'hidden') {
                closestDist = dist;
                closest = c;
            }
        });
        if (!closest) return null;
        const btn = closest.querySelector('.cylinder-card-btn');
        if (!btn) return null;
        const bRect = btn.getBoundingClientRect();
        return {
            title: closest.querySelector('.cylinder-card-title')?.textContent.trim(),
            x: bRect.x + bRect.width / 2,
            y: bRect.y + bRect.height / 2
        };
    });

    assert(frontCardInfo, 'Must find visible front-facing card on mobile');
    console.log(`- Front-facing mobile card: "${frontCardInfo.title}" at (${frontCardInfo.x}, ${frontCardInfo.y})`);

    // Tap the front-facing Shop Now button on mobile
    console.log('- Tapping mobile "Shop Now" button...');
    await page.mouse.click(frontCardInfo.x, frontCardInfo.y);
    await page.waitForTimeout(800);

    let mobileModalActive = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    console.log(`- Mobile Modal Active: ${mobileModalActive}`);
    assert.strictEqual(mobileModalActive, true, 'Mobile modal must open on "Shop Now" button tap');

    // Close modal on mobile
    await page.click('#productModal .modal-close');
    await page.waitForTimeout(400);

    assert.strictEqual(pageErrors.length, 0, `Live page errors detected: ${pageErrors.join(', ')}`);

    console.log('\n================================================================');
    console.log('🎉 100% LIVE PRODUCTION VERIFICATION PASSED ON VERCEL!');
    console.log('================================================================\n');

    await browser.close();
})().catch(err => {
    console.error('❌ Live production verification failed:', err);
    process.exit(1);
});
