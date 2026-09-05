const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
    
    console.log('Testing Live Production: https://apex-printing-seven.vercel.app ...');
    const response = await page.goto('https://apex-printing-seven.vercel.app', { waitUntil: 'networkidle' });
    console.log('HTTP Status:', response.status());

    const numCards = await page.$$eval('.cylinder-card', cards => cards.length);
    console.log('Production 3D Cards found:', numCards);

    // Test card click on production
    const firstCard = await page.locator('.cylinder-card').first();
    await firstCard.click({ force: true });
    await page.waitForTimeout(800);

    const isModalActive = await page.evaluate(() => {
        const modal = document.getElementById('productModal');
        return modal ? modal.classList.contains('active') : false;
    });
    const modalTitle = await page.evaluate(() => document.getElementById('modalTitle')?.textContent.trim() || '');
    console.log('Production Modal Active on Click:', isModalActive);
    console.log('Production Modal Title:', modalTitle);

    const screenshotPath = path.join(__dirname, 'screenshots', '13_production_live_verified.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Saved production verification screenshot to:', screenshotPath);

    await browser.close();

    if (response.status() === 200 && numCards === 16 && isModalActive) {
        console.log('==============================================');
        console.log('🚀 100% PRODUCTION LIVE VERIFICATION PASSED!');
        console.log('==============================================');
    } else {
        console.error('❌ PRODUCTION LIVE VERIFICATION FAILED');
        process.exit(1);
    }
})();
