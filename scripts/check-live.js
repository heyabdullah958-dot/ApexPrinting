const https = require('https');

const urls = [
  'https://apex-printing.vercel.app',
  'https://apex-printing-seven.vercel.app'
];

urls.forEach(baseUrl => {
  https.get(baseUrl + '/contact.html', (res) => {
    let html = '';
    res.on('data', chunk => html += chunk);
    res.on('end', () => {
      console.log(`URL: ${baseUrl}`);
      console.log(`Status: ${res.statusCode}`);
      console.log(`Has id="country": ${html.includes('id="country"')}`);
      console.log(`Has data-code="+966": ${html.includes('data-code="+966"')}`);
      console.log('-----------------------------------');
    });
  }).on('error', err => {
    console.error(`Error fetching ${baseUrl}:`, err.message);
  });
});
