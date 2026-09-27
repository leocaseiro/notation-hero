import { expect, test } from '@playwright/test';

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
 * Uncaught errors this lane tolerates, each with the ticket that removes it. Keep this list at zero
 * entries wherever possible: an allowance hides exactly the class of failure the gate exists to
 * catch, so every line here is a debt with a number on it.
 */
/** The vendored engine bundle, as vendor-alphatab.mjs serves it. See ENGINE_ONLY below. */
const ENGINE_BUNDLE = '/alphatab/esm/alphaTab.core.mjs';

const ALLOWED = [
  {
    // NH-335. AlphaTab 1.8.4 throws this out of its own worker's score DESERIALIZATION. Nothing
    // observable follows — the score renders, the transposition reaches the staff, and playback
    // runs — so this is an allowance for engine noise, not for a product failure. Ruled out by
    // measurement: the transposition itself, the tuning syntax, the track count, the bar count,
    // and a missing instrument.
    message: "Cannot read properties of undefined (reading 'voices')",
    // Scoped by ORIGIN, not by message alone and not by test name.
    //
    // The message is a GENERIC V8 TypeError — the engine indexes `.voices` in 62 places — so a
    // bare message match excuses an APP-side throw of the same words across all ~71 tests here
    // and every accessibility case, which is the opposite of what this gate is for.
    //
    // Scoping it to named tests was tried and is WRONG: NH-335's note claimed transposed.alphatex
    // was the only fixture that reaches this, and "every exported block-form file is clean". That
    // is false. Measured in CI: guitar-no-percussion.gp, alphatex-GP5.gp5 and alphatex-GPX.gpx all
    // reach it too — ordinary exported Guitar Pro files, seven throws in one case — so the fixture
    // is not what distinguishes it.
    //
    // What DOES distinguish it is where it comes from. Every frame of every occurrence sits inside
    // the vendored engine bundle, inside a Worker, with no app frame at all:
    //     at Jn.fromJson        (…/alphatab/esm/alphaTab.core.mjs)
    //     at jn.Zu              (…/alphatab/esm/alphaTab.core.mjs)
    //     at Worker.<anonymous> (…/alphatab/esm/alphaTab.core.mjs)
    // Matching the bundle PATH rather than frame names is deliberate: the build is minified and
    // its frame names change with every engine bump, but vendor-alphatab.mjs serves the engine at
    // a fixed path. So the same words thrown from app code still fail the gate, everywhere.
    origin: ENGINE_BUNDLE,
  },
];

/**
 * Whether EVERY frame of `stack` sits inside `origin`.
 *
 * One app frame anywhere means app code is on the path, and the gate must fail even though the
 * words match. A stack with no frames at all never qualifies — an unattributable throw is exactly
 * the kind this lane must not wave through.
 */
const framesAreAllEngine = (stack: string, origin: string): boolean => {
  const frames = stack.split('\n').filter((line) => line.trimStart().startsWith('at '));
  return frames.length > 0 && frames.every((frame) => frame.includes(origin));
};

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
      if (
        ALLOWED.some(
          (allowed) =>
            error.message.includes(allowed.message) &&
            framesAreAllEngine(error.stack ?? '', allowed.origin),
        )
      ) {
        return;
      }
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
