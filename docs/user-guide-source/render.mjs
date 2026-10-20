/**
 * Renders guide.html to ../FaceTrack-User-Guide.pdf using headless Chrome.
 * Requires playwright:  npm i -D playwright
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();

await page.goto("file://" + path.join(here, "guide.html"), { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });

await page.pdf({
  path: path.join(here, "..", "FaceTrack-User-Guide.pdf"),
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  margin: { top: "17mm", right: "16mm", bottom: "20mm", left: "16mm" },
  headerTemplate: "<div></div>",
  footerTemplate: `
    <div style="width:100%;font-size:7.5pt;color:#94a3b8;
                font-family:-apple-system,'Segoe UI',Arial,sans-serif;
                padding:0 16mm;display:flex;justify-content:space-between;
                border-top:1px solid #e2e8f0;padding-top:5px;margin-top:4mm;">
      <span>FaceTrack &middot; User Guide v1.0</span>
      <span>attendace-system-david.vercel.app</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`,
});

console.log("Wrote docs/FaceTrack-User-Guide.pdf");
await browser.close();
