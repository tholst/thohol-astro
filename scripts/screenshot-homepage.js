// @ts-check

import { chromium } from 'playwright';

(async () => {
  const url = 'http://localhost:4321';
  const screenshotPath = 'screenshots/homepage.png';

  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Homepage screenshot saved to ${screenshotPath}`);
  } catch (err) {
    console.error('Error taking homepage screenshot:', err);
  } finally {
    await browser.close();
  }
})();
