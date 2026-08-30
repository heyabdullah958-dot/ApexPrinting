const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function extractPDFs() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const outputDir = path.join(__dirname, '..', 'product_images');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const pdfDir = path.join(__dirname, '..', 'New folder');
    const pdfFiles = fs.readdirSync(pdfDir).filter(f => f.toLowerCase().endsWith('.pdf'));

    console.log(`Found ${pdfFiles.length} PDF files.`);

    await page.goto('about:blank');
    await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        </head>
        <body style="margin:0; background:transparent;">
            <canvas id="pdfCanvas"></canvas>
        </body>
        </html>
    `);

    await page.waitForFunction(() => typeof window.pdfjsLib !== 'undefined');

    for (const pdf of pdfFiles) {
        try {
            const pdfPath = path.join(pdfDir, pdf);
            const pdfData = fs.readFileSync(pdfPath);
            const base64 = pdfData.toString('base64');
            const safeName = pdf.replace(/\.pdf$/i, '').replace(/\s+/g, '_').toLowerCase();
            const outPath = path.join(outputDir, safeName + '.png');

            await page.evaluate(async (b64) => {
                const raw = atob(b64);
                const uint8 = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
                
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                const loadingTask = pdfjsLib.getDocument({ data: uint8 });
                const pdfDoc = await loadingTask.promise;
                const pdfPage = await pdfDoc.getPage(1);
                
                const viewport = pdfPage.getViewport({ scale: 2.5 });
                const canvas = document.getElementById('pdfCanvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await pdfPage.render({ canvasContext: ctx, viewport: viewport }).promise;
            }, base64);

            const canvasHandle = await page.$('#pdfCanvas');
            await canvasHandle.screenshot({ path: outPath });
            console.log(`Rendered: ${safeName}.png`);
        } catch (err) {
            console.error(`Failed to render ${pdf}:`, err.message);
        }
    }

    await browser.close();
    console.log('Extraction complete!');
}

extractPDFs().catch(console.error);
