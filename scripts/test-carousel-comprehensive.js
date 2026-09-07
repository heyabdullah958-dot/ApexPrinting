const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const http = require('http');

function startStaticServer(port) {
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
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

const screenshotDir = path.join(__dirname, 'screenshots', 'carousel_verification');
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
}

async function runTest() {
    console.log('================================================================');
    console.log('🚀 APEX PRINT HUB — 3D CAROUSEL COMPREHENSIVE VERIFICATION');
    console.log('================================================================\n');

    const port = 8092;
    const staticServer = await startStaticServer(port);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();

    try {
    let pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err));
    page.on('console', msg => {
        if (msg.type() === 'error') console.error('  [Browser Error]:', msg.text());
    });

    await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
    await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // STAGE 1: Verify 16 Cards & "Shop Now" Buttons
    // -------------------------------------------------------------
    console.log('[Stage 1] Verifying 3D Cards and "Shop Now" Action Buttons...');
    const cardsCount = await page.$$eval('.cylinder-card', els => els.length);
    const buttonsCount = await page.$$eval('.cylinder-card-btn', els => els.length);
    console.log(`- Found ${cardsCount} cards (expected 16)`);
    console.log(`- Found ${buttonsCount} "Shop Now" buttons (expected 16)`);
    assert.strictEqual(cardsCount, 16, 'Must have 16 cards in cylinder carousel');
    assert.strictEqual(buttonsCount, 16, 'Must have 16 "Shop Now" buttons');

    // -------------------------------------------------------------
    // STAGE 2: Accurate Hit-Testing & Hover Trigger
    // -------------------------------------------------------------
    console.log('\n[Stage 2] Testing Card Hitbox & Hover Triggering...');
    const firstCard = await page.$('.cylinder-card');
    const firstCardBox = await firstCard.boundingBox();
    assert(firstCardBox, 'First card must have bounding box');

    const midX = firstCardBox.x + firstCardBox.width / 2;
    const midY = firstCardBox.y + firstCardBox.height / 2;

    await page.mouse.move(midX, midY);
    await page.waitForTimeout(200);

    const hitEl = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return el ? { tag: el.tagName, className: el.className } : null;
    }, { x: midX, y: midY });

    console.log(`- Hit test element at center of card: <${hitEl.tag} class="${hitEl.className}">`);
    assert(hitEl.className.includes('cylinder-card'), 'Hit element must be card or child of card, not container');

    // Take screenshot of hovered card
    await page.screenshot({ path: path.join(screenshotDir, '01_card_hover.png') });
    console.log('✓ Stage 2 Passed: Hover hit-test reliably lands on .cylinder-card\n');

    // -------------------------------------------------------------
    // STAGE 3: "Shop Now" Button Click Triggers Modal
    // -------------------------------------------------------------
    console.log('[Stage 3] Testing "Shop Now" Button Click...');
    const firstBtn = await page.$('.cylinder-card:first-child .cylinder-card-btn');
    const btnBox = await firstBtn.boundingBox();
    assert(btnBox, 'First button must have bounding box');

    await page.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
    await page.waitForTimeout(200);

    await page.screenshot({ path: path.join(screenshotDir, '02_shop_now_hover.png') });
    await page.mouse.click(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
    await page.waitForTimeout(600);

    let isModalActive = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    let modalTitle = await page.evaluate(() => document.getElementById('modalTitle').textContent.trim());
    console.log(`- Modal active after clicking "Shop Now": ${isModalActive}`);
    console.log(`- Modal title: "${modalTitle}"`);
    assert.strictEqual(isModalActive, true, 'Modal must open when "Shop Now" button is clicked');
    assert(modalTitle.includes('Business Card'), 'Modal title must correspond to Luxury Business Cards');

    await page.screenshot({ path: path.join(screenshotDir, '03_modal_opened_via_btn.png') });

    // Close modal
    await page.click('#productModal .modal-close');
    await page.waitForTimeout(400);
    isModalActive = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    assert.strictEqual(isModalActive, false, 'Modal must close cleanly');
    console.log('✓ Stage 3 Passed: "Shop Now" button successfully triggered product modal\n');

    // -------------------------------------------------------------
    // STAGE 4: Zero Layout Shift & Scroll Offset Stability
    // -------------------------------------------------------------
    console.log('[Stage 4] Testing Scroll Offset & Zero Background Layout Shift...');
    await page.evaluate(() => window.scrollTo(0, 250));
    await page.waitForTimeout(200);

    const scrollBefore = await page.evaluate(() => window.pageYOffset || document.documentElement.scrollTop);
    console.log(`- Scroll position before modal: ${scrollBefore}px`);

    // Re-calculate card position after scrolling
    const scrolledCard = await page.$('.cylinder-card');
    const scrolledBox = await scrolledCard.boundingBox();
    assert(scrolledBox, 'Card must have bounding box after scrolling');
    await page.mouse.click(scrolledBox.x + scrolledBox.width / 2, scrolledBox.y + scrolledBox.height / 2);
    await page.waitForTimeout(600);

    const isModalOpenStage4 = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    assert.strictEqual(isModalOpenStage4, true, 'Modal must open when clicking card after scrolling');

    const scrollDuring = await page.evaluate(() => window.pageYOffset || document.documentElement.scrollTop);
    const bodyPosDuring = await page.evaluate(() => document.body.style.position);
    console.log(`- Scroll position during modal: ${scrollDuring}px (body.style.position: "${bodyPosDuring}")`);
    assert.strictEqual(scrollDuring, scrollBefore, 'Scroll offset must NOT reset to 0');
    assert.strictEqual(bodyPosDuring, '', 'body.style.position must NOT be set to fixed');

    await page.screenshot({ path: path.join(screenshotDir, '04_modal_scroll_stable.png') });

    // Close modal
    await page.click('#productModal .modal-close');
    await page.waitForTimeout(400);

    const scrollAfter = await page.evaluate(() => window.pageYOffset || document.documentElement.scrollTop);
    console.log(`- Scroll position after modal close: ${scrollAfter}px`);
    assert.strictEqual(scrollAfter, scrollBefore, 'Scroll position must remain exactly at 250px');
    console.log('✓ Stage 4 Passed: Zero layout shift, no scroll reset, background remains rock solid\n');

    // -------------------------------------------------------------
    // STAGE 5: Drag & Swipe UX Disambiguation
    // -------------------------------------------------------------
    console.log('[Stage 5] Testing Drag & Swipe UX Disambiguation...');
    // Scroll back to top of carousel
    await page.evaluate(() => window.scrollTo(0, 80));
    await page.waitForTimeout(300);

    const viewport = await page.$('#cylinderCarouselViewport');
    const vpBox = await viewport.boundingBox();

    // 1. Drag left by 250px
    console.log('- Dragging carousel left by 250px...');
    const startDragX = vpBox.x + vpBox.width / 2 + 100;
    const startDragY = vpBox.y + vpBox.height / 2;

    await page.mouse.move(startDragX, startDragY);
    await page.mouse.down();
    await page.mouse.move(startDragX - 250, startDragY, { steps: 25 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    isModalActive = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    console.log(`- Modal active after drag: ${isModalActive} (Expected: false)`);
    assert.strictEqual(isModalActive, false, 'Modal must NOT open during or after drag gesture');

    // 2. Drag right by 300px
    console.log('- Dragging carousel right by 300px...');
    await page.mouse.move(startDragX - 200, startDragY);
    await page.mouse.down();
    await page.mouse.move(startDragX + 100, startDragY, { steps: 25 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    isModalActive = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    console.log(`- Modal active after drag right: ${isModalActive} (Expected: false)`);
    assert.strictEqual(isModalActive, false, 'Modal must NOT open after drag gesture');

    await page.screenshot({ path: path.join(screenshotDir, '05_after_drag_motion.png') });
    console.log('✓ Stage 5 Passed: Free drag & swipe works smoothly without accidental modal opens\n');

    // -------------------------------------------------------------
    // STAGE 6: Mobile & Tablet Responsiveness
    // -------------------------------------------------------------
    console.log('[Stage 6] Testing Mobile & Tablet Viewports...');
    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(400);
    let tabletBtnVisible = await page.$eval('.cylinder-card:first-child .cylinder-card-btn', el => window.getComputedStyle(el).display !== 'none');
    assert.strictEqual(tabletBtnVisible, true, 'Shop Now button must be visible on tablet');
    await page.screenshot({ path: path.join(screenshotDir, '06_tablet_view.png') });

    // Mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    let mobileBtnVisible = await page.$eval('.cylinder-card:first-child .cylinder-card-btn', el => window.getComputedStyle(el).display !== 'none');
    assert.strictEqual(mobileBtnVisible, true, 'Shop Now button must be visible on mobile');
    await page.screenshot({ path: path.join(screenshotDir, '07_mobile_view.png') });

    // Find the visible front-facing card's Shop Now button closest to viewport center
    const frontBtn = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.cylinder-card'));
        const centerX = window.innerWidth / 2;
        let closestCard = null;
        let closestDist = Infinity;
        cards.forEach(c => {
            const rect = c.getBoundingClientRect();
            const cardMidX = rect.x + rect.width / 2;
            const dist = Math.abs(cardMidX - centerX);
            if (dist < closestDist) {
                closestDist = dist;
                closestCard = c;
            }
        });
        if (!closestCard) return null;
        const btn = closestCard.querySelector('.cylinder-card-btn');
        if (!btn) return null;
        const rect = btn.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    assert(frontBtn, 'Must find a front-facing visible card with Shop Now button');

    console.log('- Clicking front-facing button at:', frontBtn.x, frontBtn.y);
    await page.mouse.click(frontBtn.x, frontBtn.y);
    await page.waitForTimeout(600);

    isModalActive = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    console.log(`- Mobile modal active after button tap: ${isModalActive}`);
    assert.strictEqual(isModalActive, true, 'Mobile modal must open on button tap');
    await page.screenshot({ path: path.join(screenshotDir, '08_mobile_modal_opened.png') });

    console.log('✓ Stage 6 Passed: Responsive layouts verified\n');

    // Final checks
    assert.strictEqual(pageErrors.length, 0, `Browser errors detected: ${pageErrors.join(', ')}`);

    console.log('================================================================');
    console.log('🎉 ALL 6 COMPREHENSIVE 3D CAROUSEL STAGES PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');

    } finally {
        await browser.close();
        staticServer.close();
    }
}

runTest().catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});
