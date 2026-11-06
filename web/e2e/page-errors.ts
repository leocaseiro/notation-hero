import { expect, test } from '@playwright/test';

import { isKnownEngineNoiseStack } from '../lib/monitoring/known-engine-noise';

// An uncaught error in the page is INVISIBLE to Playwright by default: nothing listens for it, so a
// build can throw on every file open and every case still goes green. That is not hypothetical here
// — opening a score threw a TypeError out of AlphaTab's own worker for the whole of PR #176 and no
// check noticed (NH-335).
//
// It matters more in this lane than in most. The player's failures are reported to the person by
// error code (shared/src/error-codes.ts), and the whole point of that table is that an engine
// failure is never silent. An uncaught throw the lane ignores is the opposite of that promise.
//
// Deliberately not `page.on('pageerror', () => { throw … })`: a throw inside an event handler
// escapes the test's own call stack, so it is reported against whatever step happens to be running
// — or swallowed. Collect them and assert in afterEach, where the failure names the test.

/**
 * Fails any test in the calling file that leaves an uncaught page error behind.
 *
 * Call once at module scope, next to the imports. Registers a `beforeEach` that starts listening
 * and an `afterEach` that asserts nothing unexpected arrived.
 */
export function failOnUnexpectedPageErrors(): void {
  let unexpected: string[] = [];

  test.beforeEach(({ page }) => {
    // Reset per test rather than per file: a worker runs the tests in a file one at a time, so one
    // test's leftovers would otherwise fail the next one and point at the wrong case.
    unexpected = [];
    page.on('pageerror', (error) => {
      // The two known AlphaTab throws, and only when every frame is the engine's. The list, and
      // why each is safe, live in web/lib/monitoring/known-engine-noise.ts — the Sentry filter
      // reads it too.
      if (isKnownEngineNoiseStack(error.message, error.stack ?? '')) return;
      unexpected.push(`${error.message}\n${error.stack ?? '(no stack)'}`);
    });
  });

  test.afterEach(async ({ page }) => {
    // One round trip to the page, so any pageerror already raised has been DISPATCHED before we
    // assert. Without it a throw from a deferred (rAF) render lands after this check and the test
    // goes green on a build that threw — which is why the flaky NH-291 case reported as flaky
    // rather than as a consistent red. isClosed() keeps this hook from failing in place of the
    // test's own assertion when a case closed its page itself.
    if (!page.isClosed()) await page.evaluate(() => {});
    expect(
      unexpected,
      'the page threw an uncaught error during this test — see web/e2e/page-errors.ts',
    ).toEqual([]);
  });
}
