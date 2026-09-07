const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
    await page.goto('http://localhost:8000/index.html');
    await page.waitForTimeout(1000);

    // Scroll down 200px like in video
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(300);

    const outDir = path.join(__dirname, 'screenshots', 'selection_frames');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    await page.screenshot({ path: path.join(outDir, 'frame_00_before_click.png') });

    // Enable pointer-events fix temporarily to allow click
    await page.evaluate(() => {
        const c = document.getElementById('cylinderCarouselContainer');
        if (c) c.style.pointerEvents = 'none';
        const t = document.getElementById('cylinderCarouselTrack');
        if (t) t.style.pointerEvents = 'none';
        document.querySelectorAll('.cylinder-card').forEach(el => el.style.pointerEvents = 'auto');
    });

    const card = await page.$('.cylinder-card');
    const box = await card.boundingBox();

    console.log('Clicking card at:', box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    for (let i = 1; i <= 8; i++) {
        await page.waitForTimeout(50);
        await page.screenshot({ path: path.join(outDir, `frame_${String(i).padStart(2, '0')}_${i * 50}ms.png`) });
    }

    console.log('Saved 8 frames to:', outDir);
    await browser.close();
})();
