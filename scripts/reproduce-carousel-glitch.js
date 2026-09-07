const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err));

    await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
    await page.goto('http://localhost:8000/index.html');
    await page.waitForTimeout(1000);

    // Check hit test on carousel cards
    console.log('--- Testing hover & hit-test on center cards ---');
    const cards = await page.$$('.cylinder-card');
    console.log('Cards count:', cards.length);

    for (let i = 0; i < Math.min(cards.length, 5); i++) {
        const card = cards[i];
        const isVisible = await card.isVisible();
        const box = await card.boundingBox();
        const title = await card.$eval('.cylinder-card-title', el => el.textContent.trim());
        const opacity = await card.evaluate(el => window.getComputedStyle(el).opacity);
        const zIndex = await card.evaluate(el => window.getComputedStyle(el).zIndex);
        const transform = await card.evaluate(el => window.getComputedStyle(el).transform);
        const pointerEvents = await card.evaluate(el => window.getComputedStyle(el).pointerEvents);
        console.log(`Card ${i} ("${title}"): visible=${isVisible}, box=${JSON.stringify(box)}, opacity=${opacity}, zIndex=${zIndex}, pointerEvents=${pointerEvents}`);
    }

    // Test mouse hover over first card
    const firstCardBox = await cards[0].boundingBox();
    if (firstCardBox) {
        console.log('Moving mouse to center of first card:', firstCardBox.x + firstCardBox.width / 2, firstCardBox.y + firstCardBox.height / 2);
        await page.mouse.move(firstCardBox.x + firstCardBox.width / 2, firstCardBox.y + firstCardBox.height / 2);
        await page.waitForTimeout(200);
        
        // Check what element is at this point
        const elementAtPoint = await page.evaluate(({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            return el ? { tag: el.tagName, className: el.className, text: el.textContent?.substring(0, 30) } : null;
        }, { x: firstCardBox.x + firstCardBox.width / 2, y: firstCardBox.y + firstCardBox.height / 2 });
        console.log('Element at point of Card 0:', elementAtPoint);
    }

    // Now test clicking Card 0 via real mouse click
    console.log('--- Performing real page.mouse.click on Card 0 ---');
    await page.mouse.click(firstCardBox.x + firstCardBox.width / 2, firstCardBox.y + firstCardBox.height / 2);
    await page.waitForTimeout(500);

    const isModalActive = await page.evaluate(() => document.getElementById('productModal').classList.contains('active'));
    console.log('Is modal active after mouse click?', isModalActive);

    // Check body styles when modal active
    const bodyStyle = await page.evaluate(() => ({
        position: document.body.style.position,
        top: document.body.style.top,
        overflow: document.body.style.overflow,
        width: document.body.style.width
    }));
    console.log('Body styles during modal:', bodyStyle);

    await browser.close();
})();
