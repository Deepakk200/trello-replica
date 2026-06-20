// Real-browser virtualization benchmark. Loads the dev harness at several card
// counts and measures the actual DOM node count + a within-list drag-reorder.
const { chromium } = require('playwright');

const BASE = process.env.BENCH_BASE || 'http://localhost:3123';
const SEL_ITEM = '[role="listitem"]';

async function scrollEl(page, frac) {
  await page.evaluate((f) => {
    const el = document.querySelector('[data-virtualized="true"]') || document.querySelector('.cards-scroll');
    if (el) el.scrollTop = Math.round(el.scrollHeight * f);
  }, frac);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  console.log('=== DOM node count vs card count (real virtualization proof) ===');
  for (const n of [100, 1000, 5000, 10000]) {
    const t0 = Date.now();
    await page.goto(`${BASE}/dev/virtual-bench?n=${n}`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForSelector('[data-bench-ready="true"]', { timeout: 120000 });
    await page.waitForSelector(SEL_ITEM, { timeout: 120000 });
    await page.waitForTimeout(700);
    const renderMs = Date.now() - t0;
    const top = await page.locator(SEL_ITEM).count();
    const totalDom = await page.evaluate(() => document.querySelectorAll('*').length);
    await scrollEl(page, 0.5); await page.waitForTimeout(250);
    const mid = await page.locator(SEL_ITEM).count();
    await scrollEl(page, 1); await page.waitForTimeout(250);
    const bottom = await page.locator(SEL_ITEM).count();
    console.log(`n=${String(n).padEnd(6)} mountedCards(top/mid/bottom)=${top}/${mid}/${bottom}  totalDOMNodes=${totalDom}  firstRender=${renderMs}ms`);
  }

  console.log('\n=== within-list drag-reorder on a virtualized (n=1000) list ===');
  await page.goto(`${BASE}/dev/virtual-bench?n=1000`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForSelector(SEL_ITEM, { timeout: 120000 });
  await page.waitForTimeout(600);
  const before = (await page.locator(SEL_ITEM).first().innerText()).split('\n').find(Boolean);
  const box = await page.locator(SEL_ITEM).first().boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 8, { steps: 4 }); // pass activation distance
    await page.mouse.move(box.x + box.width / 2, box.y + 280, { steps: 14 });
    await page.waitForTimeout(250);
    await page.mouse.up();
    await page.waitForTimeout(400);
  }
  const after = (await page.locator(SEL_ITEM).first().innerText()).split('\n').find(Boolean);
  console.log(`first card before="${before}"  after="${after}"  reordered=${before !== after}`);

  await browser.close();
})().catch((e) => { console.error('BENCH ERROR:', e.message); process.exit(1); });
