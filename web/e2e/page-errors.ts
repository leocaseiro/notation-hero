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
const ALLOWED = [
  // NH-335. AlphaTab 1.8.4 throws this out of its own worker's score deserialization when handed a
  // hand-written TERSE alphaTex score. transposed.alphatex is the only such fixture in the repo;
  // every exported block-form file is clean. Ruled out by measurement: the transposition itself,
  // the tuning syntax, the track count, the bar count, and a missing instrument. Nothing observable
  // follows — the score renders, the transposition reaches the staff, and playback runs — so this
  // is an allowance for engine noise, not for a product failure. Matched on the message because the
  // stack is minified and its frame names change with every engine bump.
  "Cannot read properties of undefined (reading 'voices')",
];

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
      if (ALLOWED.some((allowed) => error.message.includes(allowed))) return;
      unexpected.push(`${error.message}\n${error.stack ?? '(no stack)'}`);
    });
  });

  test.afterEach(() => {
    expect(
      unexpected,
      'the page threw an uncaught error during this test — see web/e2e/page-errors.ts',
    ).toEqual([]);
  });
}
