const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err));
    await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
    
    console.log('Navigating to https://apex-printing-seven.vercel.app ...');
    await page.goto('https://apex-printing-seven.vercel.app');
    await page.waitForTimeout(1000);

    console.log('Dispatching click via evaluate...');
    await page.evaluate(() => {
        const card = document.querySelector('.cylinder-card');
        card.click();
    });
    await page.waitForTimeout(800);

    const isModalActive = await page.evaluate(() => {
        const modal = document.getElementById('productModal');
        return modal ? modal.classList.contains('active') : false;
    });
    const modalTitle = await page.evaluate(() => document.getElementById('modalTitle')?.textContent.trim() || '');
    console.log('isModalActive:', isModalActive);
    console.log('modalTitle:', modalTitle);

    const screenshotPath = path.join(__dirname, 'screenshots', '13_production_modal_verified.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot saved to:', screenshotPath);

    await browser.close();

    if (isModalActive && modalTitle.includes('Business Card')) {
        console.log('==============================================');
        console.log('🚀 LIVE PRODUCTION MODAL VERIFIED 100% SUCCESS!');
        console.log('==============================================');
    }
})();
