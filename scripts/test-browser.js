const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
}

async function runBrowserTests() {
    console.log('🚀 Launching Chromium / Chrome browser...');
    let browser;
    try {
        browser = await chromium.launch({ channel: 'chrome', headless: true });
    } catch (e) {
        console.log('Chrome channel launch fallback to bundled/msedge/chromium...');
        try {
            browser = await chromium.launch({ channel: 'msedge', headless: true });
        } catch (e2) {
            browser = await chromium.launch({ headless: true });
        }
    }

    const context = await browser.newContext({
        viewport: { width: 1280, height: 900 }
    });
    const page = await context.newPage();

    const results = [];

    // --- TEST 1: HOME PAGE (index.html) ---
    console.log('\n--- 1. Testing Home Page (http://localhost:8000/index.html) ---');
    await page.goto('http://localhost:8000/index.html');
    await page.waitForTimeout(1000);

    const currencySelectorHome = await page.$('#currencySelector');
    const hasCurrencyHome = currencySelectorHome !== null;
    console.log(`- Currency Selector present in DOM: ${hasCurrencyHome} (Expected: false)`);
    results.push({ test: 'Home Page Currency Selector Removed', passed: !hasCurrencyHome });

    await page.screenshot({ path: path.join(screenshotDir, '01_home_page.png'), fullPage: false });

    // --- TEST 2: SERVICES & MODAL / CART INQUIRY FLOW (services.html) ---
    console.log('\n--- 2. Testing Products & Modal Flow (http://localhost:8000/services.html) ---');
    await page.goto('http://localhost:8000/services.html');
    await page.waitForTimeout(1000);

    // Open first product card modal
    const productCard = await page.$('.product-card');
    if (productCard) {
        await productCard.click();
        await page.waitForTimeout(600);

        // Check if price amount or pricing container is visible/present
        const priceContainer = await page.$('.product-pricing');
        const modalPrice = await page.$('#modalPrice');
        console.log(`- Pricing container in product modal: ${priceContainer !== null} (Expected: false)`);
        console.log(`- #modalPrice in product modal: ${modalPrice !== null} (Expected: false)`);
        results.push({ test: 'Product Pricing Block Removed', passed: priceContainer === null && modalPrice === null });

        // Check select options text for any "+AED" or "+$"
        const optionTexts = await page.$$eval('#modalOptionsContainer select option', options => options.map(o => o.textContent));
        const hasPriceDeltas = optionTexts.some(txt => txt.includes('AED') || txt.includes('$') || txt.includes('PKR') || txt.includes('SR'));
        console.log(`- Option texts contain price deltas: ${hasPriceDeltas} (Sample: ${optionTexts.slice(0, 3).join(', ')})`);
        results.push({ test: 'Option Pricing Deltas Removed', passed: !hasPriceDeltas });

        // Check submit button text
        const btnText = await page.$eval('#modalSubmitBtn', el => el.textContent.trim());
        console.log(`- Modal Submit Button Text: "${btnText}"`);
        results.push({ test: 'Modal Button Updated to Order Request', passed: btnText.includes('Add to Order Request') || btnText.includes('Request a Quote') });

        await page.screenshot({ path: path.join(screenshotDir, '02_product_modal.png') });

        // Click Add to Order Request
        await page.click('#modalSubmitBtn');
        await page.waitForTimeout(800);

        // Open Cart
        await page.click('button:has-text("Cart")');
        await page.waitForTimeout(600);

        const cartHeading = await page.$eval('#cartOverlay h2', el => el.textContent.trim());
        console.log(`- Cart Header: "${cartHeading}"`);

        const cartCheckoutBtnText = await page.$eval('#cartCheckoutBtn', el => el.textContent.trim());
        console.log(`- Cart CTA Button Text: "${cartCheckoutBtnText}"`);
        results.push({ test: 'Cart CTA Button Updated to Submit Order Request', passed: cartCheckoutBtnText.includes('Submit Order Request') });

        await page.screenshot({ path: path.join(screenshotDir, '03_order_cart_drawer.png') });

        // Click Cart Submit button to redirect to contact inquiry
        await page.click('#cartCheckoutBtn');
        await page.waitForTimeout(1000);

        console.log(`- Current URL after cart checkout: ${page.url()}`);
        results.push({ test: 'Cart Redirection to Contact Form with Injected Specs', passed: page.url().includes('contact.html') });
    }

    // --- TEST 3: CONTACT FORM SUBMISSION (contact.html) ---
    console.log('\n--- 3. Testing Contact & Order Form Submission (contact.html) ---');
    await page.goto('http://localhost:8000/contact.html');
    await page.waitForTimeout(1000);

    const paymentMethodField = await page.$('#paymentMethod');
    console.log(`- Payment Method dropdown in Contact Form: ${paymentMethodField !== null} (Expected: false)`);
    results.push({ test: 'Payment Method Dropdown Removed', passed: paymentMethodField === null });

    // Fill contact form
    await page.fill('#firstName', 'Alexander');
    await page.fill('#lastName', 'Wright');
    await page.fill('#email', 'alex.wright@example.com');
    await page.fill('#phone', '+971 50 123 4567');
    await page.selectOption('#country', 'UAE');
    await page.selectOption('#service', 'Brochures');
    await page.fill('#message', 'Need 1,000 tri-fold brochures on 150gsm matte paper with gold foil accents for our luxury portfolio.');

    await page.screenshot({ path: path.join(screenshotDir, '04_contact_form_filled.png') });

    // Submit form
    console.log('- Submitting Order Request Form...');
    await page.click('#submitBtn');
    await page.waitForTimeout(2000);

    const isSuccessVisible = await page.$eval('#formSuccess', el => window.getComputedStyle(el).display !== 'none');
    console.log(`- Form Success Message Visible: ${isSuccessVisible}`);
    results.push({ test: 'Contact Form Successfully Dispatched & Feedback Shown', passed: isSuccessVisible });

    await page.screenshot({ path: path.join(screenshotDir, '05_contact_form_success.png') });

    console.log('\n========================================');
    console.log('BROWSER TEST SUMMARY');
    console.log('========================================');
    results.forEach(r => {
        console.log(`${r.passed ? '✅' : '❌'} ${r.test}: ${r.passed ? 'PASSED' : 'FAILED'}`);
    });
    console.log('========================================\n');

    await browser.close();
}

runBrowserTests().catch(err => {
    console.error('Browser testing error:', err);
    process.exit(1);
});
