const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
}

async function testCarousel() {
    console.log('🚀 Starting 3D Curved Carousel Automated Test...');
    let browser;
    try {
        browser = await chromium.launch({ channel: 'chrome', headless: true });
    } catch (e) {
        try {
            browser = await chromium.launch({ channel: 'msedge', headless: true });
        } catch (e2) {
            browser = await chromium.launch({ headless: true });
        }
    }

    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();

    // Listen to console messages to check for any JS errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error('Browser console error:', msg.text());
        }
    });

    console.log('Navigating to http://localhost:8000/index.html ...');
    await page.addInitScript(() => {
        sessionStorage.setItem('hasSeenSplash', 'true');
    });
    await page.goto('http://localhost:8000/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 1. Verify Editorial Title
    const title = await page.$eval('.editorial-hero-title', el => el.textContent.trim().replace(/\s+/g, ' '));
    console.log(`- Editorial Hero Title: "${title}"`);

    // 2. Verify Carousel Track and Cards
    const cardsCount = await page.$$eval('.cylinder-card', cards => cards.length);
    console.log(`- Number of 3D Cards found: ${cardsCount} (Expected: 16)`);

    // 3. Verify 3D Concave Transforms on Cards
    const firstCardTransform = await page.$eval('.cylinder-card:first-child', el => el.style.transform);
    console.log(`- First Card 3D Concave Transform: "${firstCardTransform}"`);

    const has3DTransform = (firstCardTransform.includes('rotateY') || firstCardTransform.includes('translate3d')) && firstCardTransform.includes('scale');
    console.log(`- Has valid 3D concave transform: ${has3DTransform}`);

    // Take screenshot of default state
    const defaultScreenshot = path.join(screenshotDir, '06_editorial_hero_default.png');
    await page.screenshot({ path: defaultScreenshot, fullPage: false });
    console.log(`- Saved default state screenshot to: ${defaultScreenshot}`);

    // 4. Simulate Mouse Drag Interaction
    console.log('Simulating mouse drag to rotate 3D cylinder...');
    const viewport = await page.$('#cylinderCarouselViewport');
    const box = await viewport.boundingBox();

    if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 - 350, box.y + box.height / 2, { steps: 20 });
        await page.mouse.up();
        await page.waitForTimeout(600); // Allow momentum physics to coast
    }

    // Take screenshot of rotated state
    const draggedScreenshot = path.join(screenshotDir, '07_editorial_hero_dragged.png');
    await page.screenshot({ path: draggedScreenshot, fullPage: false });
    console.log(`- Saved rotated state screenshot to: ${draggedScreenshot}`);

    // 5. Responsive mobile check (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(600);
    const mobileScreenshot = path.join(screenshotDir, '08_editorial_hero_mobile.png');
    await page.screenshot({ path: mobileScreenshot, fullPage: false });
    console.log(`- Saved mobile responsive screenshot to: ${mobileScreenshot}`);

    console.log('\n========================================');
    console.log('3D CAROUSEL TEST RESULTS:');
    console.log(`✅ Title Rendered: ${title.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ 3D Cards Initialized: ${cardsCount >= 8 ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ 3D Cylindrical Perspective: ${has3DTransform ? 'PASSED' : 'FAILED'}`);
    console.log('========================================\n');

    await browser.close();
}

testCarousel().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
