const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
    
    console.log('Navigating to http://localhost:8000/index.html ...');
    await page.goto('http://localhost:8000/index.html');
    await page.waitForTimeout(1000);
    
    console.log('Simulating mouse click on center product card...');
    await page.evaluate(() => {
        const firstCard = document.querySelector('.cylinder-card');
        firstCard.click();
    });
    await page.waitForTimeout(800);

    const isModalActive = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    const modalTitle = await page.evaluate(() => document.getElementById('modalTitle').textContent.trim());
    console.log('Modal active state:', isModalActive);
    console.log('Modal product title:', modalTitle);

    const screenshotPath = path.join(__dirname, 'screenshots', '12_product_modal_opened.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Saved modal screenshot to:', screenshotPath);

    await browser.close();

    if (isModalActive && modalTitle.includes('Business Card')) {
        console.log('========================================');
        console.log('✅ PRODUCT CARD CLICK TO OPEN MODAL: PASSED!');
        console.log('========================================');
    } else {
        console.error('❌ PRODUCT CARD CLICK TEST FAILED!');
        process.exit(1);
    }
})();
