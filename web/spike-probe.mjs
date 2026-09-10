/**
 * SPIKE probe (scratch): drives the /spike route in a real browser, captures console +
 * failed requests + a screenshot. Run against `next start` (prod) or `next dev`.
 *   node spike-probe.mjs http://localhost:3002/spike out-prod
 */
// Resolved out of client/'s install so the spike adds no dependency to web/.
const { chromium } = await import('../client/node_modules/@playwright/test/index.mjs');
import { mkdirSync, writeFileSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:3002/spike';
const tag = process.argv[3] ?? 'run';
const outDir = new URL('./spike-out/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });

const logs = [];
const failed = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText}`));
page.on('response', (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
});

await page.goto(url, { waitUntil: 'networkidle' });

// Give the worker / soundfont / render pipeline a chance.
let state = {};
for (let i = 0; i < 40; i++) {
  state = await page
    .getAttribute('[data-testid="spike-status"]', 'data-ready')
    .then(async (ready) => ({
      ready,
      soundfont: await page.getAttribute('[data-testid="spike-status"]', 'data-soundfont'),
      mounts: await page.getAttribute('[data-testid="spike-status"]', 'data-mounts'),
      disposes: await page.getAttribute('[data-testid="spike-status"]', 'data-disposes'),
      error: await page.getAttribute('[data-testid="spike-status"]', 'data-error'),
    }));
  if (state.ready === 'true' && state.soundfont === 'true') break;
  await page.waitForTimeout(500);
}

const svgCount = await page.locator('[data-testid="alphatab-host"] svg').count();
const trackText = await page
  .locator('[data-testid="tracks"]')
  .textContent()
  .catch(() => '');

// Try playback: click Play, wait, read the position + playing flag.
let playback = { attempted: false };
if (state.soundfont === 'true') {
  playback.attempted = true;
  await page.click('[data-testid="play"]');
  await page.waitForTimeout(2500);
  playback.playing = await page.getAttribute('[data-testid="spike-status"]', 'data-playing');
  playback.position = await page.locator('[data-testid="spike-status"]').textContent();
  // Does a cursor element exist and has it moved off zero?
  playback.cursorBar = await page.locator('[data-testid="alphatab-host"] .at-cursor-bar').count();
  playback.cursorBeatLeft = await page
    .locator('[data-testid="alphatab-host"] .at-cursor-beat')
    .first()
    .evaluate((el) => getComputedStyle(el).transform + ' | ' + el.style.left)
    .catch((error) => `n/a: ${error.message}`);
  await page.click('[data-testid="stop"]');
}

await page.screenshot({ path: `${outDir}${tag}.png`, fullPage: true });

const report = {
  url,
  state,
  svgCount,
  trackText,
  playback,
  failedRequests: failed,
  logs: logs.slice(0, 120),
};
writeFileSync(`${outDir}${tag}.json`, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({ state, svgCount, trackText, playback, failedRequests: failed }, null, 2),
);
console.log('--- console (first 60) ---');
console.log(logs.slice(0, 60).join('\n'));

await browser.close();
