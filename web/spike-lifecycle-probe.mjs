/**
 * SPIKE probe (scratch): mount/unmount lifecycle. Answers two separate questions the single-load
 * probe cannot:
 *   1. Does React 19 strict mode actually double-invoke effects here? (the `control` counter)
 *   2. Does AlphaTab's destroy() + recreate leak surfaces or workers across remounts?
 *
 *   node spike-lifecycle-probe.mjs http://localhost:3002/spike dev
 */
const { chromium } = await import('../client/node_modules/@playwright/test/index.mjs');
import { mkdirSync, writeFileSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:3002/spike';
const tag = process.argv[3] ?? 'lifecycle';
const outDir = new URL('./spike-out/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`);
});

const counters = () =>
  page.evaluate(() => ({
    control: globalThis.__spikeControl ?? null,
    lifecycle: globalThis.__spikeLifecycle ?? null,
    surfaces: document.querySelectorAll('.at-surface').length,
    // AlphaTab renders each partial as an SVG inside its surface.
    svgs: document.querySelectorAll('[data-testid="alphatab-host"] svg').length,
  }));

const waitReady = async () => {
  for (let i = 0; i < 40; i++) {
    const ready = await page.getAttribute('[data-testid="spike-status"]', 'data-ready');
    if (ready === 'true') return true;
    await page.waitForTimeout(500);
  }
  return false;
};

await page.goto(url, { waitUntil: 'networkidle' });
await waitReady();
const afterFirstMount = await counters();

// Three explicit remounts (new key => full unmount + mount).
const remounts = [];
for (let i = 0; i < 3; i++) {
  await page.click('[data-testid="remount"]');
  await waitReady();
  await page.waitForTimeout(400);
  remounts.push(await counters());
}

// Unmount entirely — everything AlphaTab rendered should be gone.
await page.click('[data-testid="toggle-mount"]');
await page.waitForTimeout(800);
const afterUnmount = await counters();

const report = { url, afterFirstMount, remounts, afterUnmount, errors };
writeFileSync(`${outDir}${tag}-lifecycle.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

await browser.close();
