const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  console.log('🚀 Testing LIVE Production Deployment: https://apex-printing-seven.vercel.app/contact.html ...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.addInitScript(() => sessionStorage.setItem('hasSeenSplash', 'true'));

  const response = await page.goto('https://apex-printing-seven.vercel.app/contact.html', { waitUntil: 'networkidle' });
  console.log(`- HTTP Status: ${response.status()}`);
  assert.strictEqual(response.status(), 200, 'Live contact page must return HTTP 200');

  // Initial check
  const placeholderInitial = await page.getAttribute('#phone', 'placeholder');
  console.log(`- Initial Live Phone Placeholder: "${placeholderInitial}"`);
  assert(placeholderInitial.includes('+971'), 'Initial placeholder must contain +971');

  // Test 1: Select Saudi Arabia
  console.log('\n- Action: Selecting Saudi Arabia (SAR)...');
  await page.selectOption('#country', 'SAR');
  let phoneVal = await page.inputValue('#phone');
  let placeholder = await page.getAttribute('#phone', 'placeholder');
  console.log(`  Live Phone Value: "${phoneVal}"`);
  console.log(`  Live Placeholder: "${placeholder}"`);
  assert(phoneVal.includes('+966'), 'Live phone value must contain +966 for Saudi Arabia');
  assert(placeholder.includes('+966'), 'Live placeholder must contain +966 for Saudi Arabia');

  // Type phone digits
  await page.fill('#phone', '+966 50 123 4567');
  console.log('  Typed: "+966 50 123 4567"');

  // Test 2: Select Pakistan
  console.log('\n- Action: Selecting Pakistan (PKR)...');
  await page.selectOption('#country', 'PKR');
  phoneVal = await page.inputValue('#phone');
  placeholder = await page.getAttribute('#phone', 'placeholder');
  console.log(`  Live Phone Value: "${phoneVal}"`);
  console.log(`  Live Placeholder: "${placeholder}"`);
  assert(phoneVal.includes('+92 50 123 4567'), 'Live phone value must preserve digits and update dial code to +92');
  assert(placeholder.includes('+92'), 'Live placeholder must contain +92 for Pakistan');

  // Test 3: Select UAE
  console.log('\n- Action: Selecting UAE...');
  await page.selectOption('#country', 'UAE');
  phoneVal = await page.inputValue('#phone');
  console.log(`  Live Phone Value: "${phoneVal}"`);
  assert(phoneVal.includes('+971 50 123 4567'), 'Live phone value must update dial code to +971');

  // Test 4: Focus empty input
  console.log('\n- Action: Clearing phone input and clicking/focusing...');
  await page.fill('#phone', '');
  await page.click('#phone');
  phoneVal = await page.inputValue('#phone');
  console.log(`  Live Focused Phone Value: "${phoneVal}"`);
  assert(phoneVal.includes('+971'), 'Live focused empty phone input must prefill active dial code');

  await browser.close();
  console.log('\n========================================================');
  console.log('🎉 100% LIVE PRODUCTION DEPLOYMENT VERIFICATION PASSED!');
  console.log('========================================================');
})();
