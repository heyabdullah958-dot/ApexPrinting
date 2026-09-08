const path = require('path');
const fs = require('fs');
const assert = require('assert');
const express = require('../backend/node_modules/express');
const { chromium } = require('playwright');

async function runPhase1CatalogAlignmentTest() {
    console.log('================================================================');
    console.log('🚀 RUNNING PHASE 1 CATALOG & CUSTOMIZATION OPTIONS TEST');
    console.log('================================================================\n');

    // 1. Start static frontend test server on port 8088
    const app = express();
    app.get('/favicon.ico', (req, res) => res.status(204).end());
    app.use(express.static(path.join(__dirname, '..')));
    const server = await new Promise((resolve) => {
        const s = app.listen(8088, () => resolve(s));
    });
    console.log('✓ Static test server listening at http://localhost:8088\n');

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

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const loc = msg.location();
            if (loc && loc.url && loc.url.includes('favicon.ico')) return;
            console.log(`[Console ERROR] ${msg.text()} (${JSON.stringify(loc)})`);
            consoleErrors.push(msg.text());
        }
    });
    page.on('requestfailed', req => {
        console.log(`[Request Failed] ${req.url()}: ${req.failure()?.errorText}`);
    });
    page.on('response', resp => {
        if (!resp.ok()) {
            console.log(`[HTTP ${resp.status()}] ${resp.url()}`);
        }
    });

    try {
        // -------------------------------------------------------------
        // TEST 1: Pruning of 3 Products & Renaming of Letterhead
        // -------------------------------------------------------------
        console.log('[Test 1] Verifying 3D Cylinder Carousel cards in index.html...');
        await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));
        await page.goto('http://localhost:8088/index.html', { waitUntil: 'domcontentloaded' });

        const cardTitles = await page.$$eval('.cylinder-card-title', els => els.map(e => e.textContent.trim()));
        console.log(`- Total carousel cards found: ${cardTitles.length} (Expected: 13)`);
        assert.strictEqual(cardTitles.length, 13, `Expected exactly 13 carousel cards, got ${cardTitles.length}`);

        // Confirm Editorial Brochures, Corporate Booklets, and Exhibition Posters no longer appear
        const forbiddenProducts = ['Editorial Brochures', 'Corporate Booklets', 'Exhibition Posters'];
        for (const forbidden of forbiddenProducts) {
            const foundInCards = cardTitles.some(t => t.toLowerCase() === forbidden.toLowerCase());
            assert.strictEqual(foundInCards, false, `Forbidden product "${forbidden}" must NOT appear in carousel cards`);
        }

        const bodyText = await page.evaluate(() => document.body.innerText);
        for (const forbidden of forbiddenProducts) {
            assert.strictEqual(bodyText.includes(forbidden), false, `Forbidden text "${forbidden}" must NOT appear in index.html body`);
        }
        console.log('✓ Pruned products (Editorial Brochures, Corporate Booklets, Exhibition Posters) successfully excised.');

        // Confirm Letterhead renaming
        const hasExecutiveLetterhead = cardTitles.some(t => t.toLowerCase().includes('executive letterhead'));
        assert.strictEqual(hasExecutiveLetterhead, false, 'Card title must not contain "Executive Letterhead"');

        const letterheadCardIndex = cardTitles.indexOf('Letterhead');
        assert.notStrictEqual(letterheadCardIndex, -1, 'Must have a carousel card titled exactly "Letterhead"');
        console.log('✓ Letterhead card found with exact title "Letterhead" (no "Executive").');

        // Test clicking Letterhead card to verify modal
        const letterheadBtn = page.locator(`.cylinder-card:has(.cylinder-card-title:text-is("Letterhead")) .cylinder-card-btn`);
        const ariaLabel = await letterheadBtn.getAttribute('aria-label');
        assert.strictEqual(ariaLabel, 'Shop Letterhead', 'Shop button aria-label must be "Shop Letterhead"');

        await letterheadBtn.dispatchEvent('click');
        await page.waitForSelector('#productModal.active', { state: 'visible', timeout: 3000 });
        const modalTitle = await page.$eval('#modalTitle', el => el.textContent.trim());
        assert.strictEqual(modalTitle, 'Letterhead', 'Modal title must be "Letterhead"');
        assert.strictEqual(modalTitle.includes('Executive'), false, 'Modal title must not contain "Executive"');

        await page.evaluate(() => window.closeProductModal());
        await page.waitForSelector('#productModal.active', { state: 'hidden', timeout: 3000 });
        console.log('✓ Letterhead modal title verified: "Letterhead" without "Executive".');

        // Confirm carousel subtitles don't advertise pruned options
        const cardSubtitles = await page.$$eval('.cylinder-card-subtitle', els => els.map(e => e.textContent.trim()));
        const bcSubtitle = cardSubtitles[0] || '';
        assert.strictEqual(bcSubtitle.includes('450+ GSM'), false, 'Business Cards subtitle must not advertise 450+ GSM');
        const pfSubtitle = cardSubtitles[2] || '';
        assert.strictEqual(pfSubtitle.toLowerCase().includes('pocket'), false, 'Presentation Folders subtitle must not advertise Pockets');
        console.log('✓ Carousel subtitles verified: 450+ GSM and Pockets cleanly removed from cards.\n');

        // -------------------------------------------------------------
        // TEST 2: Envelopes Modal — Remove "Sides" Option
        // -------------------------------------------------------------
        console.log('[Test 2] Verifying Envelopes modal options...');
        await page.evaluate(() => window.openProductModal('Envelopes'));
        await page.waitForSelector('#productModal.active', { state: 'visible', timeout: 3000 });

        const envelopeSelects = await page.$$eval('#modalOptionsContainer select.modal-option-select', els => 
            els.map(el => ({
                optionName: el.dataset.optionName,
                label: el.previousElementSibling ? el.previousElementSibling.textContent.trim() : ''
            }))
        );

        const envelopeHasSides = envelopeSelects.some(s => 
            s.optionName.toLowerCase() === 'sides' || s.label.toLowerCase().includes('sides')
        );
        assert.strictEqual(envelopeHasSides, false, 'Envelopes modal must NOT contain "Sides" dropdown/option');
        console.log('✓ Envelopes modal: "Sides" selector successfully removed.');
        console.log('  Remaining options:', envelopeSelects.map(s => s.optionName));

        await page.evaluate(() => window.closeProductModal());
        await page.waitForSelector('#productModal.active', { state: 'hidden', timeout: 3000 });

        // -------------------------------------------------------------
        // TEST 3: Presentation Folders Modal — Remove "Pockets" Option & Prune Paper Stock
        // -------------------------------------------------------------
        console.log('\n[Test 3] Verifying Presentation Folders modal options...');
        await page.evaluate(() => window.openProductModal('Presentation Folders'));
        await page.waitForSelector('#productModal.active', { state: 'visible', timeout: 3000 });

        const folderSelects = await page.$$eval('#modalOptionsContainer select.modal-option-select', els => 
            els.map(el => ({
                optionName: el.dataset.optionName,
                label: el.previousElementSibling ? el.previousElementSibling.textContent.trim() : ''
            }))
        );

        const folderHasPockets = folderSelects.some(s => 
            s.optionName.toLowerCase() === 'pockets' || s.label.toLowerCase().includes('pockets')
        );
        assert.strictEqual(folderHasPockets, false, 'Presentation Folder modal must NOT contain "Pockets" option');
        console.log('✓ Presentation Folder modal: "Pockets" selector successfully removed.');

        const folderStockOptions = await page.$$eval(
            '#modalOptionsContainer select[data-option-name="Paper Stock"] option',
            opts => opts.map(o => o.textContent.trim())
        );
        console.log('  Presentation Folder Paper Stock options:', folderStockOptions);
        assert.deepStrictEqual(folderStockOptions, ['300 GSM', '350 GSM'], 'Paper Stock must strictly be 300 GSM and 350 GSM');

        await page.evaluate(() => window.closeProductModal());
        await page.waitForSelector('#productModal.active', { state: 'hidden', timeout: 3000 });

        // -------------------------------------------------------------
        // TEST 4: Brochures Modal — Rename "Lamination" to "Paper Finish"
        // -------------------------------------------------------------
        console.log('\n[Test 4] Verifying Brochures modal options...');
        await page.evaluate(() => window.openProductModal('Brochures'));
        await page.waitForSelector('#productModal.active', { state: 'visible', timeout: 3000 });

        const brochureSelects = await page.$$eval('#modalOptionsContainer select.modal-option-select', els => 
            els.map(el => ({
                optionName: el.dataset.optionName,
                label: el.previousElementSibling ? el.previousElementSibling.textContent.trim() : ''
            }))
        );

        const hasLamination = brochureSelects.some(s => 
            s.optionName.toLowerCase() === 'lamination' || s.label.toLowerCase().includes('lamination')
        );
        assert.strictEqual(hasLamination, false, 'Brochures modal must NOT contain "Lamination" label/option');

        const finishSelect = brochureSelects.find(s => s.optionName === 'Paper Finish');
        assert(finishSelect, 'Brochures modal must have "Paper Finish" option');
        assert.strictEqual(finishSelect.label, 'PAPER FINISH', 'Brochures modal label must display "PAPER FINISH"');

        const finishOptions = await page.$$eval(
            '#modalOptionsContainer select[data-option-name="Paper Finish"] option',
            opts => opts.map(o => o.textContent.trim())
        );
        console.log('  Brochures Paper Finish options:', finishOptions);
        assert.deepStrictEqual(finishOptions, ['Matt', 'Glossy'], 'Paper Finish options must be Matt and Glossy');
        console.log('✓ Brochures modal: "Lamination" successfully renamed to "Paper Finish".');

        await page.evaluate(() => window.closeProductModal());
        await page.waitForSelector('#productModal.active', { state: 'hidden', timeout: 3000 });

        // -------------------------------------------------------------
        // TEST 5: Business Cards Modal — Restrict Paper Stock & Corners
        // -------------------------------------------------------------
        console.log('\n[Test 5] Verifying Business Cards modal options...');
        await page.evaluate(() => window.openProductModal('Business Cards'));
        await page.waitForSelector('#productModal.active', { state: 'visible', timeout: 3000 });

        const cardStockOptions = await page.$$eval(
            '#modalOptionsContainer select[data-option-name="Paper Stock"] option',
            opts => opts.map(o => o.textContent.trim())
        );
        console.log('  Business Cards Paper Stock options:', cardStockOptions);
        assert.deepStrictEqual(cardStockOptions, ['300 GSM', '350 GSM'], 'Paper Stock must strictly be 300 GSM and 350 GSM');

        const cornerOptions = await page.$$eval(
            '#modalOptionsContainer select[data-option-name="Corners"] option',
            opts => opts.map(o => o.textContent.trim())
        );
        console.log('  Business Cards Corners options:', cornerOptions);
        assert.deepStrictEqual(cornerOptions, ['Straight Cut', 'Round Corner'], 'Corner options must strictly be Straight Cut and Round Corner');
        console.log('✓ Business Cards: Paper Stock strictly 300/350 GSM, Corners strictly Straight Cut/Round Corner.');

        await page.evaluate(() => window.closeProductModal());
        await page.waitForSelector('#productModal.active', { state: 'hidden', timeout: 3000 });

        // -------------------------------------------------------------
        // TEST 6: Cart & Checkout Payload Integrity
        // -------------------------------------------------------------
        console.log('\n[Test 6] Testing Cart addition and Checkout Payload integrity...');
        
        // Add items to cart
        for (const prod of ['Business Cards', 'Envelopes', 'Presentation Folders', 'Brochures', 'Letterhead']) {
            await page.evaluate(async (p) => {
                window.openProductModal(p);
                const btn = document.getElementById('modalSubmitBtn');
                if (btn && btn.onclick) {
                    await btn.onclick({ preventDefault: () => {} });
                }
            }, prod);
            await page.waitForTimeout(200);
        }

        const cartItems = await page.evaluate(() => JSON.parse(localStorage.getItem('apex_cart') || '[]'));
        console.log(`- Cart items stored in localStorage: ${cartItems.length}`);
        assert.strictEqual(cartItems.length, 5, 'Cart must contain 5 items');

        // Check options inside each cart item
        const envelopesItem = cartItems.find(i => i.title === 'Envelopes');
        assert(envelopesItem, 'Envelopes item must be in cart');
        const envSideOpt = envelopesItem.options.find(o => o.label.toLowerCase().includes('side'));
        assert.strictEqual(envSideOpt, undefined, 'Envelopes in cart must NOT have Sides option');

        const folderItem = cartItems.find(i => i.title === 'Presentation Folders');
        assert(folderItem, 'Presentation Folders item must be in cart');
        const folderPocketOpt = folderItem.options.find(o => o.label.toLowerCase().includes('pocket'));
        assert.strictEqual(folderPocketOpt, undefined, 'Presentation Folders in cart must NOT have Pockets option');

        const brochureItem = cartItems.find(i => i.title === 'Brochures');
        assert(brochureItem, 'Brochures item must be in cart');
        const brochureLamOpt = brochureItem.options.find(o => o.label.toLowerCase().includes('lamination'));
        assert.strictEqual(brochureLamOpt, undefined, 'Brochures in cart must NOT have Lamination option');
        const brochureFinishOpt = brochureItem.options.find(o => o.label.toLowerCase().includes('paper finish'));
        assert(brochureFinishOpt, 'Brochures in cart must have Paper Finish option');

        const bcItem = cartItems.find(i => i.title === 'Business Cards');
        assert(bcItem, 'Business Cards item must be in cart');
        const bcStock = bcItem.options.find(o => o.label.toLowerCase().includes('paper stock'));
        assert.strictEqual(bcStock.value, '300 GSM', 'Business Cards stock must be 300 GSM');
        const bcCorner = bcItem.options.find(o => o.label.toLowerCase().includes('corner'));
        assert.strictEqual(bcCorner.value, 'Straight Cut', 'Business Cards corner must be Straight Cut');

        console.log('✓ Cart items correctly structured with pruned options and no undefined fields.');

        // Navigate to contact.html and verify renderCheckoutOrderReview
        console.log('\n[Test 7] Navigating to contact.html to verify checkout review rendering...');
        await page.goto('http://localhost:8088/contact.html', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#checkoutOrderReview', { state: 'visible', timeout: 3000 });

        const reviewCards = await page.$$eval('.checkout-item-card', els => els.length);
        console.log(`- Checkout review cards rendered: ${reviewCards}`);
        assert.strictEqual(reviewCards, 5, 'Checkout review panel must render 5 item cards');

        const reviewTitles = await page.$$eval('.checkout-item-title', els => els.map(e => e.textContent.trim()));
        console.log('  Rendered items:', reviewTitles);
        assert(reviewTitles.includes('Letterhead'), 'Must include Letterhead in checkout review');

        console.log('✓ Checkout order review panel renders flawlessly without errors.\n');

        // -------------------------------------------------------------
        // TEST 8: Deep-Linking Auto-Open Modal on index.html
        // -------------------------------------------------------------
        console.log('\n[Test 8] Verifying Deep-Linking Auto-Open Modal...');
        await page.goto('http://localhost:8088/index.html?product=Executive+Letterhead', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#productModal.active', { state: 'visible', timeout: 3000 });
        const deepModalTitle = await page.$eval('#modalTitle', el => el.textContent.trim());
        console.log(`- Auto-opened modal title: "${deepModalTitle}"`);
        assert.strictEqual(deepModalTitle, 'Letterhead', 'Deep link to Executive Letterhead must open "Letterhead" modal');

        await page.evaluate(() => window.closeProductModal());
        await page.waitForSelector('#productModal.active', { state: 'hidden', timeout: 3000 });

        await page.goto('http://localhost:8088/index.html?product=Presentation+Folders', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#productModal.active', { state: 'visible', timeout: 3000 });
        const pfHasPockets = await page.$$eval('#modalOptionsContainer select', els => els.some(e => e.dataset.optionName === 'Pockets'));
        assert.strictEqual(pfHasPockets, false, 'Deep linked Presentation Folders modal must not have Pockets');
        console.log('✓ Deep-linking modal verified: auto-opens requested product with canonical sanitized title and options.\n');

        // -------------------------------------------------------------
        // TEST 9: URL Query Parameter Pre-filling on contact.html
        // -------------------------------------------------------------
        console.log('[Test 9] Testing service parameter pre-filling on contact.html...');
        const testParamCases = [
            { query: 'service=Executive+Letterhead', expected: 'Letterhead' },
            { query: 'service=Letterheads', expected: 'Letterhead' },
            { query: 'service=letterhead', expected: 'Letterhead' },
            { query: 'product=Executive+Letterhead', expected: 'Letterhead' },
            { query: 'service=editorial+brochures', expected: 'Brochures' },
            { query: 'service=corporate+booklets', expected: 'Booklets' },
            { query: 'service=exhibition+posters', expected: 'Posters' }
        ];

        for (const tc of testParamCases) {
            await page.goto(`http://localhost:8088/contact.html?${tc.query}`, { waitUntil: 'domcontentloaded' });
            const selectedVal = await page.$eval('#service', el => el.value);
            console.log(`  ?${tc.query} -> Selected: "${selectedVal}" (Expected: "${tc.expected}")`);
            assert.strictEqual(selectedVal, tc.expected, `Query "?${tc.query}" must select "${tc.expected}" in #service dropdown`);
        }
        console.log('✓ All service and product query parameters correctly resolve to canonical options.\n');

        // -------------------------------------------------------------
        // TEST 10: Legacy Pre-Existing Cart Schema Migration (sanitizeCart)
        // -------------------------------------------------------------
        console.log('[Test 10] Testing legacy pre-existing cart schema migration (sanitizeCart)...');
        const legacyCart = [
            {
                title: 'Executive Letterhead',
                options: [{ label: 'Size', value: 'Letter (8.5x11")' }]
            },
            {
                title: 'Envelopes',
                options: [
                    { label: 'Size', value: 'Standard' },
                    { label: 'Sides', value: 'Both Sides' }
                ]
            },
            {
                title: 'Presentation Folders',
                options: [
                    { label: 'Size', value: '9x12" (With Pockets)' },
                    { label: 'Pockets', value: 'Both Pockets' },
                    { label: 'Lamination', value: 'Matt Lamination' }
                ]
            },
            {
                title: 'Brochures',
                options: [
                    { label: 'Fold Type', value: 'Tri-fold' },
                    { label: 'Lamination', value: 'Matt' }
                ]
            },
            {
                title: 'Editorial Brochures',
                options: []
            }
        ];

        await page.evaluate((lc) => {
            localStorage.setItem('apex_cart', JSON.stringify(lc));
        }, legacyCart);

        await page.goto('http://localhost:8088/contact.html', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#checkoutOrderReview', { state: 'visible', timeout: 3000 });

        const migratedCart = await page.evaluate(() => JSON.parse(localStorage.getItem('apex_cart') || '[]'));
        console.log('- Migrated cart length:', migratedCart.length);
        assert.strictEqual(migratedCart.length, 5, 'Migrated cart must preserve all 5 items');

        // Verify Item 1 title migration
        assert.strictEqual(migratedCart[0].title, 'Letterhead', 'Item 1 title must migrate to "Letterhead"');

        // Verify Item 2 has no Sides
        const item2HasSides = migratedCart[1].options.some(o => o.label.toLowerCase().includes('side'));
        assert.strictEqual(item2HasSides, false, 'Envelopes must have Sides stripped from legacy options');

        // Verify Item 3 has no Pockets
        const item3HasPockets = migratedCart[2].options.some(o => o.label.toLowerCase().includes('pocket'));
        assert.strictEqual(item3HasPockets, false, 'Presentation Folders must have Pockets stripped from legacy options');

        // Verify Item 4 has Paper Finish instead of Lamination
        const item4HasLam = migratedCart[3].options.some(o => o.label.toLowerCase() === 'lamination');
        assert.strictEqual(item4HasLam, false, 'Brochures must not retain "Lamination" label');
        const item4HasFinish = migratedCart[3].options.some(o => o.label.toUpperCase() === 'PAPER FINISH');
        assert.strictEqual(item4HasFinish, true, 'Brochures must acquire "PAPER FINISH" label');

        // Verify Item 5 pruned product name migration
        assert.strictEqual(migratedCart[4].title, 'Brochures', 'Pruned product "Editorial Brochures" must migrate to "Brochures"');

        // Verify DOM rendering
        const renderedTitles = await page.$$eval('.checkout-item-title', els => els.map(e => e.textContent.trim()));
        assert(renderedTitles.includes('Letterhead'), 'Rendered checkout review must display Letterhead');
        assert(!renderedTitles.includes('Executive Letterhead'), 'Rendered checkout review must not display Executive Letterhead');

        const renderedTags = await page.$$eval('.checkout-item-opt-tag', els => els.map(e => e.textContent.trim()));
        const hasLegacyPockets = renderedTags.some(t => t.toLowerCase().includes('pockets:'));
        assert.strictEqual(hasLegacyPockets, false, 'Rendered tags must not contain Pockets');
        const hasLegacySides = renderedTags.some(t => t.toLowerCase().includes('sides:'));
        assert.strictEqual(hasLegacySides, false, 'Rendered tags must not contain Sides');
        console.log('✓ Legacy cart migration successfully purged obsolete keys and sanitized product titles.\n');

        // Check console errors
        const relevantErrors = consoleErrors.filter(e => !e.includes('favicon'));
        assert.strictEqual(relevantErrors.length, 0, `Browser console had errors: ${relevantErrors.join('; ')}`);
        console.log('✓ Zero browser console errors recorded.');

        console.log('\n================================================================');
        console.log('🎉 ALL PHASE 1 CATALOG ALIGNMENT TESTS PASSED WITH 100% SUCCESS!');
        console.log('================================================================\n');

    } finally {
        await browser.close();
        server.close();
    }
}

runPhase1CatalogAlignmentTest().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
