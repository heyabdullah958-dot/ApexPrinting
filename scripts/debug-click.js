const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err));
    await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
    await page.goto('http://localhost:8000/index.html');
    await page.waitForTimeout(1000);

    console.log('--- Test 1: Calling window.openProductModal directly ---');
    await page.evaluate(() => {
        window.openProductModal('Luxury Business Cards', 'Custom foil & cotton stock', 'product_images/business_card.png', null);
    });
    let isActive = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    let title = await page.evaluate(() => document.getElementById('modalTitle').textContent);
    console.log('Direct call -> isModalActive:', isActive, 'title:', title);

    await page.evaluate(() => window.closeProductModal());
    console.log('--- Closed Modal ---');

    console.log('--- Test 2: Dispatching click on .cylinder-card ---');
    await page.evaluate(() => {
        const firstCard = document.querySelector('.cylinder-card');
        firstCard.click();
    });
    isActive = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    title = await page.evaluate(() => document.getElementById('modalTitle').textContent);
    console.log('Card click -> isModalActive:', isActive, 'title:', title);

    await browser.close();
})();
