const express = require('../backend/node_modules/express');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
}

async function runVerification() {
    console.log('================================================================');
    console.log('🚀 APEX PRINT HUB — PROCESS & WHY APEX VERIFICATION SUITE');
    console.log('================================================================\n');

    // 1. Start static server on port 8008
    const app = express();
    app.use(express.static(path.join(__dirname, '..')));
    const server = await new Promise((resolve) => {
        const s = app.listen(8008, () => {
            console.log('✓ Test static server running at http://localhost:8008');
            resolve(s);
        });
    });

    let browser;
    try {
        browser = await chromium.launch({ headless: true });
    } catch (e) {
        try {
            browser = await chromium.launch({ channel: 'chrome', headless: true });
        } catch (e2) {
            browser = await chromium.launch({ channel: 'msedge', headless: true });
        }
    }

    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
        const page = await context.newPage();

        // Listen for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') console.error('  [Browser Error]:', msg.text());
        });

        // Bypass splash screen for instant testing
        await page.addInitScript(() => {
            sessionStorage.setItem('hasSeenSplash', 'true');
        });

        console.log('\n--- STAGE 1: Desktop Navigation & Section Elements ---');
        await page.goto('http://localhost:8008/index.html', { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);

        // Check nav links href
        const processLinkHref = await page.$eval('a.nav-link[href="#process"]', el => el.getAttribute('href'));
        const whyApexLinkHref = await page.$eval('a.nav-link[href="#why-apex"]', el => el.getAttribute('href'));
        console.log(`✓ Nav link "Process" href: "${processLinkHref}"`);
        console.log(`✓ Nav link "Why Apex" href: "${whyApexLinkHref}"`);
        assert.strictEqual(processLinkHref, '#process', 'Process link href must be #process');
        assert.strictEqual(whyApexLinkHref, '#why-apex', 'Why Apex link href must be #why-apex');

        // Verify sections exist in DOM
        const processSection = await page.$('#process');
        const whyApexSection = await page.$('#why-apex');
        assert.ok(processSection, 'Section #process must exist in the DOM');
        assert.ok(whyApexSection, 'Section #why-apex must exist in the DOM');
        console.log('✓ Verified both #process and #why-apex sections exist in DOM');

        console.log('\n--- STAGE 2: Navigation Smooth Scroll Interactions ---');
        // Click Process in navigation
        console.log('Clicking "Process" navigation link...');
        await page.click('a.nav-link[href="#process"]');
        await page.waitForTimeout(1000); // allow smooth scroll to complete

        const processRect = await page.$eval('#process', el => {
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, height: r.height };
        });
        console.log(`  Process section boundingClientRect.top: ${Math.round(processRect.top)}px`);
        assert.ok(processRect.top >= -20 && processRect.top <= 150, `Process section should scroll into view near top (got ${processRect.top})`);
        console.log('✓ "Process" smooth scroll verified: section correctly aligned below navbar');

        // Click Why Apex in navigation
        console.log('Clicking "Why Apex" navigation link...');
        await page.click('a.nav-link[href="#why-apex"]');
        await page.waitForTimeout(1200); // allow smooth scroll to complete

        const whyApexRect = await page.$eval('#why-apex', el => {
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, height: r.height };
        });
        console.log(`  Why Apex section boundingClientRect.top: ${Math.round(whyApexRect.top)}px`);
        assert.ok(whyApexRect.top >= -20 && whyApexRect.top <= 150, `Why Apex section should scroll into view near top (got ${whyApexRect.top})`);
        console.log('✓ "Why Apex" smooth scroll verified: section correctly aligned below navbar');

        console.log('\n--- STAGE 3: Process Section Content & Structure ---');
        const processEyebrow = await page.$eval('#process .section-eyebrow', el => el.textContent.trim());
        const processTitle = await page.$eval('#process .section-title', el => el.textContent.trim().replace(/\s+/g, ' '));
        console.log(`✓ Process Eyebrow: "${processEyebrow}"`);
        console.log(`✓ Process Title: "${processTitle}"`);
        assert.ok(processEyebrow.toLowerCase().includes('how it works'), 'Eyebrow should say How It Works');
        assert.ok(processTitle.toLowerCase().includes('simple. fast. perfect.'), 'Title should contain Simple. Fast. Perfect.');

        // Check gold gradient styling on .serif in title
        const processSerifHasGold = await page.$eval('#process .section-title .serif', el => {
            const s = window.getComputedStyle(el);
            return s.webkitTextFillColor === 'transparent' || s.backgroundImage.includes('gradient');
        });
        console.log(`✓ Process Title ".serif" metallic gold gradient applied: ${processSerifHasGold}`);
        assert.ok(processSerifHasGold, 'Process title italic serif must have metallic gold gradient text fill');

        // Check a11y aria-hidden on step SVGs
        const stepSvgsA11y = await page.$$eval('#process .process-icon-wrap svg', svgs => {
            return svgs.every(svg => svg.getAttribute('aria-hidden') === 'true');
        });
        console.log(`✓ Process Step decorative SVGs have aria-hidden="true": ${stepSvgsA11y}`);
        assert.ok(stepSvgsA11y, 'All decorative step SVGs must have aria-hidden="true"');

        const processCards = await page.$$eval('#process .process-card', cards => {
            return cards.map(c => ({
                num: c.querySelector('.process-num-badge')?.textContent.trim(),
                title: c.querySelector('.process-title')?.textContent.trim(),
                desc: c.querySelector('.process-desc')?.textContent.trim(),
                tagsCount: c.querySelectorAll('.process-tag').length,
                hasIcon: !!c.querySelector('.process-icon-wrap svg')
            }));
        });
        console.log(`✓ Number of Process Steps found: ${processCards.length} (Expected: 4)`);
        assert.strictEqual(processCards.length, 4, 'Must have exactly 4 process cards');

        processCards.forEach((c, idx) => {
            console.log(`   [Step ${c.num}] "${c.title}" (Tags: ${c.tagsCount}, Icon: ${c.hasIcon})`);
            assert.ok(c.hasIcon, `Step ${c.num} must have an icon`);
            assert.ok(c.title.length > 0, `Step ${c.num} must have a title`);
            assert.ok(c.desc.length > 20, `Step ${c.num} must have a description`);
        });

        assert.strictEqual(processCards[0].title, 'Choose Your Product');
        assert.strictEqual(processCards[1].title, 'Upload Your Design');
        assert.strictEqual(processCards[2].title, 'Approve & Pay');
        assert.strictEqual(processCards[3].title, 'Fast Delivery');
        console.log('✓ All 4 process steps match specification exactly');

        console.log('\n--- STAGE 4: Why Apex Section Content & Structure ---');
        const whyEyebrow = await page.$eval('#why-apex .section-eyebrow', el => el.textContent.trim());
        const whyTitle = await page.$eval('#why-apex .section-title', el => el.textContent.trim().replace(/\s+/g, ' '));
        console.log(`✓ Why Apex Eyebrow: "${whyEyebrow}"`);
        console.log(`✓ Why Apex Title: "${whyTitle}"`);
        assert.ok(whyEyebrow.toLowerCase().includes('why choose us'), 'Eyebrow should say Why Choose Us');
        assert.ok(whyTitle.toLowerCase().includes('the apex difference'), 'Title should contain The Apex Difference');

        // Check gold gradient styling on .serif in title
        const whySerifHasGold = await page.$eval('#why-apex .section-title .serif', el => {
            const s = window.getComputedStyle(el);
            return s.webkitTextFillColor === 'transparent' || s.backgroundImage.includes('gradient');
        });
        console.log(`✓ Why Apex Title ".serif" metallic gold gradient applied: ${whySerifHasGold}`);
        assert.ok(whySerifHasGold, 'Why Apex title italic serif must have metallic gold gradient text fill');

        // Check computed transition on pillar card includes opacity
        const pillarTransition = await page.$eval('.pillar-card', el => window.getComputedStyle(el).transitionProperty);
        console.log(`✓ Pillar Card computed transitionProperty: "${pillarTransition}"`);
        assert.ok(pillarTransition.includes('opacity'), 'Pillar Card transitionProperty must include opacity for smooth .reveal fade-in');

        // Check a11y aria-hidden on pillar SVGs
        const pillarSvgsA11y = await page.$$eval('#why-apex .pillar-icon-box svg', svgs => {
            return svgs.every(svg => svg.getAttribute('aria-hidden') === 'true');
        });
        console.log(`✓ Why Apex Pillar decorative SVGs have aria-hidden="true": ${pillarSvgsA11y}`);
        assert.ok(pillarSvgsA11y, 'All decorative pillar SVGs must have aria-hidden="true"');

        const pillarCards = await page.$$eval('#why-apex .pillar-card', cards => {
            return cards.map(c => ({
                title: c.querySelector('.pillar-title')?.textContent.trim(),
                metric: c.querySelector('.pillar-metric-tag')?.textContent.trim(),
                desc: c.querySelector('.pillar-desc')?.textContent.trim(),
                featuresCount: c.querySelectorAll('.pillar-feature-item').length,
                hasIcon: !!c.querySelector('.pillar-icon-box svg')
            }));
        });
        console.log(`✓ Number of Why Apex Pillars found: ${pillarCards.length} (Expected: 4)`);
        assert.strictEqual(pillarCards.length, 4, 'Must have exactly 4 pillar cards');

        pillarCards.forEach((p, idx) => {
            console.log(`   [Pillar ${idx + 1}] "${p.title}" (Metric: ${p.metric}, Features: ${p.featuresCount})`);
            assert.ok(p.hasIcon, `Pillar "${p.title}" must have an icon`);
            assert.ok(p.featuresCount >= 2, `Pillar "${p.title}" must have feature checklist items`);
        });

        assert.strictEqual(pillarCards[0].title, 'Vibrant Color Accuracy');
        assert.strictEqual(pillarCards[1].title, 'Fast Turnaround');
        assert.strictEqual(pillarCards[2].title, 'Premium Materials');
        assert.strictEqual(pillarCards[3].title, 'Quality Guaranteed');
        console.log('✓ All 4 value pillars match specification exactly');

        // Check Artisan Pressroom Showcase
        const hasShowcaseImg = await page.$eval('#why-apex .why-showcase-img-wrap img', img => !!img.src && img.complete);
        const sealText = await page.$eval('#why-apex .why-spin-seal', el => el.textContent.replace(/\s+/g, ' ').trim());
        const statsCount = await page.$$eval('#why-apex .why-stat-box', boxes => boxes.length);
        console.log(`✓ Artisan Showcase Image loaded: ${hasShowcaseImg}`);
        console.log(`✓ Quality Seal Badge Text: "${sealText}"`);
        console.log(`✓ Workshop Stats count: ${statsCount} (Expected: 3)`);
        assert.ok(hasShowcaseImg, 'Showcase image must be loaded');
        assert.ok(sealText.includes('PREMIUM') && sealText.includes('GUARANTEED'), 'Seal must have guarantee text');
        assert.strictEqual(statsCount, 3, 'Must have 3 workshop stat boxes');

        console.log('\n--- STAGE 5: Capture Desktop Screenshots ---');
        // Scroll to process and capture
        await page.$eval('#process', el => el.scrollIntoView({ behavior: 'instant' }));
        await page.waitForTimeout(500);
        const processShot = path.join(screenshotDir, 'verify_desktop_process.png');
        const processElem = await page.$('#process');
        await processElem.screenshot({ path: processShot });
        console.log(`✓ Saved desktop Process screenshot to: ${processShot}`);

        // Scroll to why-apex and showcase to trigger reveal animations
        await page.$eval('#why-apex', el => el.scrollIntoView({ behavior: 'instant' }));
        await page.waitForTimeout(400);
        await page.$eval('#why-apex .why-showcase-panel', el => el.scrollIntoView({ behavior: 'instant' }));
        await page.waitForTimeout(600);
        await page.$eval('#why-apex', el => el.scrollIntoView({ behavior: 'instant' }));
        await page.waitForTimeout(400);

        const whyApexShot = path.join(screenshotDir, 'verify_desktop_why_apex.png');
        const whyApexElem = await page.$('#why-apex');
        await whyApexElem.screenshot({ path: whyApexShot });
        console.log(`✓ Saved desktop Why Apex screenshot to: ${whyApexShot}`);

        const showcaseShot = path.join(screenshotDir, 'verify_desktop_showcase.png');
        const showcaseElem = await page.$('#why-apex .why-showcase-panel');
        await showcaseElem.screenshot({ path: showcaseShot });
        console.log(`✓ Saved desktop Artisan Showcase screenshot to: ${showcaseShot}`);

        console.log('\n--- STAGE 6: Tablet Responsiveness (768x1024) ---');
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(400);

        const tabletProcessCols = await page.$eval('#process .process-grid', el => {
            return window.getComputedStyle(el).getPropertyValue('grid-template-columns').trim().split(/\s+/).length;
        });
        const tabletPillarCols = await page.$eval('#why-apex .why-pillars-grid', el => {
            return window.getComputedStyle(el).getPropertyValue('grid-template-columns').trim().split(/\s+/).length;
        });
        const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

        console.log(`✓ Tablet Process Columns: ${tabletProcessCols} (Expected: 2)`);
        console.log(`✓ Tablet Why Apex Columns: ${tabletPillarCols} (Expected: 2)`);
        console.log(`✓ Tablet Horizontal Overflow: ${tabletOverflow} (Expected: false)`);
        assert.strictEqual(tabletProcessCols, 2, 'Process grid on tablet must have 2 columns');
        assert.strictEqual(tabletPillarCols, 2, 'Why Apex grid on tablet must have 2 columns');
        assert.strictEqual(tabletOverflow, false, 'No horizontal overflow allowed on tablet');

        console.log('\n--- STAGE 7: Mobile Responsiveness (375x812) & Real Menu Scroll ---');
        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(400);

        const mobileProcessCols = await page.$eval('#process .process-grid', el => {
            return window.getComputedStyle(el).getPropertyValue('grid-template-columns').trim().split(/\s+/).length;
        });
        const mobilePillarCols = await page.$eval('#why-apex .why-pillars-grid', el => {
            return window.getComputedStyle(el).getPropertyValue('grid-template-columns').trim().split(/\s+/).length;
        });
        const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

        console.log(`✓ Mobile Process Columns: ${mobileProcessCols} (Expected: 1)`);
        console.log(`✓ Mobile Why Apex Columns: ${mobilePillarCols} (Expected: 1)`);
        console.log(`✓ Mobile Horizontal Overflow: ${mobileOverflow} (Expected: false)`);
        assert.strictEqual(mobileProcessCols, 1, 'Process grid on mobile must have 1 column');
        assert.strictEqual(mobilePillarCols, 1, 'Why Apex grid on mobile must have 1 column');
        assert.strictEqual(mobileOverflow, false, 'No horizontal overflow allowed on mobile');

        // Test mobile hamburger menu navigation to #process
        console.log('Testing mobile hamburger menu navigation to #process...');
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(300);
        await page.click('#hamburger');
        await page.waitForTimeout(400);
        const isNavActive = await page.$eval('#navLinks', el => el.classList.contains('active'));
        assert.ok(isNavActive, 'Mobile nav drawer should open on hamburger click');
        console.log('✓ Mobile hamburger menu successfully opened');

        // Click Process in mobile drawer
        await page.click('#navLinks a[href="#process"]');
        await page.waitForTimeout(1000);
        const isNavClosedAfterClick = await page.$eval('#navLinks', el => !el.classList.contains('active'));
        assert.ok(isNavClosedAfterClick, 'Mobile nav drawer should close after link click');
        console.log('✓ Mobile nav drawer closed automatically upon link click');

        // VERIFY REAL SCROLL POSITION (without manual cheating!)
        const mobileProcessTop = await page.$eval('#process', el => el.getBoundingClientRect().top);
        console.log(`✓ Mobile actual scroll top for #process: ${Math.round(mobileProcessTop)}px`);
        assert.ok(mobileProcessTop >= -20 && mobileProcessTop <= 150, `Mobile click must accurately scroll to #process (got ${mobileProcessTop})`);

        // Capture mobile screenshots
        const mobileProcessShot = path.join(screenshotDir, 'verify_mobile_process.png');
        await (await page.$('#process')).screenshot({ path: mobileProcessShot });
        console.log(`✓ Saved mobile Process screenshot to: ${mobileProcessShot}`);

        await page.$eval('#why-apex', el => el.scrollIntoView({ behavior: 'instant' }));
        await page.waitForTimeout(400);
        await page.$eval('#why-apex .why-showcase-panel', el => el.scrollIntoView({ behavior: 'instant' }));
        await page.waitForTimeout(500);
        await page.$eval('#why-apex', el => el.scrollIntoView({ behavior: 'instant' }));
        await page.waitForTimeout(400);

        const mobileWhyApexShot = path.join(screenshotDir, 'verify_mobile_why_apex.png');
        await (await page.$('#why-apex')).screenshot({ path: mobileWhyApexShot });
        console.log(`✓ Saved mobile Why Apex screenshot to: ${mobileWhyApexShot}`);

        const mobileShowcaseShot = path.join(screenshotDir, 'verify_mobile_showcase.png');
        await (await page.$('#why-apex .why-showcase-panel')).screenshot({ path: mobileShowcaseShot });
        console.log(`✓ Saved mobile Artisan Showcase screenshot to: ${mobileShowcaseShot}`);

        console.log('\n--- STAGE 8: External Link Navigation & Alias Verification ---');
        // Test direct URL with #process
        await page.goto('http://localhost:8008/index.html#process', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1200);
        const hashProcessTop = await page.$eval('#process', el => el.getBoundingClientRect().top);
        console.log(`✓ Direct hash navigation http://localhost:8008/index.html#process top: ${Math.round(hashProcessTop)}px`);
        assert.ok(hashProcessTop >= -20 && hashProcessTop <= 150, 'Direct hash #process should land near top');

        // Test direct URL with #why-apex
        await page.goto('http://localhost:8008/index.html#why-apex', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1200);
        const hashWhyApexTop = await page.$eval('#why-apex', el => el.getBoundingClientRect().top);
        console.log(`✓ Direct hash navigation http://localhost:8008/index.html#why-apex top: ${Math.round(hashWhyApexTop)}px`);
        assert.ok(hashWhyApexTop >= -20 && hashWhyApexTop <= 150, 'Direct hash #why-apex should land near top');

        // Test direct URL with legacy alias #why-us
        await page.goto('http://localhost:8008/index.html#why-us', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1200);
        const hashWhyUsTop = await page.$eval('#why-apex', el => el.getBoundingClientRect().top);
        console.log(`✓ Legacy alias navigation http://localhost:8008/index.html#why-us lands at why-apex top: ${Math.round(hashWhyUsTop)}px`);
        assert.ok(hashWhyUsTop >= -20 && hashWhyUsTop <= 150, 'Legacy alias #why-us should land at why-apex near top');

        console.log('\n--- STAGE 9: Accessibility — OS-Level Prefers-Reduced-Motion ---');
        const rmContext = await browser.newContext({ reducedMotion: 'reduce' });
        const rmPage = await rmContext.newPage();
        await rmPage.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
        await rmPage.goto('http://localhost:8008/index.html', { waitUntil: 'networkidle' });

        const sealAnimName = await rmPage.$eval('.why-spin-seal', el => window.getComputedStyle(el).animationName);
        console.log(`✓ Reduced motion computed animationName on seal: "${sealAnimName}" (Expected: none)`);
        assert.strictEqual(sealAnimName, 'none', 'Under prefers-reduced-motion: reduce, why-spin-seal animation must be disabled');
        await rmContext.close();

        console.log('\n--- STAGE 10: Extreme Narrow Viewport Reflow (280px & 320px) ---');
        for (const width of [320, 280]) {
            await page.setViewportSize({ width, height: 700 });
            await page.waitForTimeout(200);
            const hasHOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
            console.log(`✓ Viewport width ${width}px horizontal overflow: ${hasHOverflow} (Expected: false)`);
            assert.strictEqual(hasHOverflow, false, `Viewport ${width}px must have zero horizontal overflow`);
        }

        console.log('\n--- STAGE 11: Footer Quick Links Verification ---');
        // Check index.html footer
        const indexFooterProcess = await page.$eval('.footer a[href="#process"]', el => el.textContent.trim());
        const indexFooterWhyApex = await page.$eval('.footer a[href="#why-apex"]', el => el.textContent.trim());
        console.log(`✓ index.html footer links: "${indexFooterProcess}", "${indexFooterWhyApex}"`);
        assert.strictEqual(indexFooterProcess, 'Process');
        assert.strictEqual(indexFooterWhyApex, 'Why Apex');

        // Check services.html footer
        await page.goto('http://localhost:8008/services.html', { waitUntil: 'networkidle' });
        const servicesFooterProcess = await page.$eval('.footer a[href="index.html#process"]', el => el.textContent.trim());
        const servicesFooterWhyApex = await page.$eval('.footer a[href="index.html#why-apex"]', el => el.textContent.trim());
        console.log(`✓ services.html footer links: "${servicesFooterProcess}", "${servicesFooterWhyApex}"`);
        assert.strictEqual(servicesFooterProcess, 'Process');
        assert.strictEqual(servicesFooterWhyApex, 'Why Apex');

        // Check contact.html footer
        await page.goto('http://localhost:8008/contact.html', { waitUntil: 'networkidle' });
        const contactFooterProcess = await page.$eval('.footer a[href="index.html#process"]', el => el.textContent.trim());
        const contactFooterWhyApex = await page.$eval('.footer a[href="index.html#why-apex"]', el => el.textContent.trim());
        console.log(`✓ contact.html footer links: "${contactFooterProcess}", "${contactFooterWhyApex}"`);
        assert.strictEqual(contactFooterProcess, 'Process');
        assert.strictEqual(contactFooterWhyApex, 'Why Apex');

        console.log('\n================================================================');
        console.log('🎉 ALL PROCESS & WHY APEX VERIFICATION STAGES PASSED (11/11)!');
        console.log('================================================================\n');

    } finally {
        if (browser) await browser.close();
        if (server) server.close();
    }
}

runVerification().catch(err => {
    console.error('❌ Verification failed:', err);
    process.exitCode = 1;
    process.exit(1);
});
