const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
    await page.goto('http://localhost:8000/index.html');
    await page.waitForTimeout(1000);

    // Apply pointer-events: none on container and track
    await page.evaluate(() => {
        document.getElementById('cylinderCarouselContainer').style.pointerEvents = 'none';
        document.getElementById('cylinderCarouselTrack').style.pointerEvents = 'none';
        document.querySelectorAll('.cylinder-card').forEach(c => c.style.pointerEvents = 'auto');
    });

    const firstCard = await page.$('.cylinder-card');
    const box = await firstCard.boundingBox();
    const hit = await page.evaluate(({x, y}) => {
        const el = document.elementFromPoint(x, y);
        return el ? { tag: el.tagName, className: el.className } : null;
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });

    console.log('Element at point with pointerEvents: none on container:', hit);

    // Now click with mouse
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);
    const isModalActive = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    console.log('Is modal active after mouse click?', isModalActive);
    await browser.close();
})();
