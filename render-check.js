// Advisory render check: desktop-light and phone-dark. Reports page overflow, unregistered Candor
// tags and console errors, and saves screenshots to screenshots/. It never blocks a deploy.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const dir = __dirname;
  fs.mkdirSync(path.join(dir, 'screenshots'), { recursive: true });
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const browser = await chromium.launch();
  const errs = [];
  for (const [w, scheme, name] of [[1200, 'light', 'desk-light'], [400, 'dark', 'phone-dark']]) {
    const p = await browser.newPage({ viewport: { width: w, height: 900 }, colorScheme: scheme });
    p.on('pageerror', (e) => errs.push(name + ': ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(name + ': ' + m.text()); });
    await p.setContent(html, { waitUntil: 'load' });
    await p.waitForTimeout(2000);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const undefinedTags = await p.evaluate(() => [...new Set([...document.querySelectorAll('*')].map((e) => e.localName).filter((n) => n.startsWith('candor-') && !customElements.get(n)))]);
    const forkRows = await p.evaluate(() => document.getElementById('fork-table')?.rows?.length ?? 0);
    console.log(name, 'overflow', overflow, 'undefined tags', undefinedTags, 'fork rows', forkRows);
    await p.screenshot({ path: path.join(dir, 'screenshots', name + '.png'), fullPage: true });
  }
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})();
