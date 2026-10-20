import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const htmlPath = path.join(__dirname, 'user-guide.html');
const pdfPath = path.join(__dirname, '..', 'FaceTrack-User-Guide.pdf');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

// Give fonts/styles a moment to settle
await new Promise(r => setTimeout(r, 1000));

await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: {
    top: '0mm',
    right: '0mm',
    bottom: '0mm',
    left: '0mm',
  },
  displayHeaderFooter: false,
});

await browser.close();
console.log(`PDF saved to: ${pdfPath}`);
