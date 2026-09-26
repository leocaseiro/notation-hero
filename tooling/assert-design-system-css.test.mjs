import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  REQUIRED_SELECTORS,
  assertDesignSystemCss,
} from '../web/scripts/assert-design-system-css.mjs';

// Build the fixture FROM the guard's own list rather than repeating the selectors here, so adding
// a selector to the guard cannot leave this test asserting against a stale copy.
const ruleFor = ([selector]) => `${selector}{color:red}`;
const stylesheet = (entries) => entries.map(ruleFor).join('\n');

/** A temp directory holding one stylesheet, laid out the way next build emits them. */
const withOutput = (css, run) => {
  const dir = mkdtempSync(join(tmpdir(), 'assert-design-system-css-'));
  try {
    mkdirSync(join(dir, 'chunks'), { recursive: true });
    if (css !== null) writeFileSync(join(dir, 'chunks', 'app.css'), css);
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('passes when every required selector reached the stylesheet', () => {
  withOutput(stylesheet(REQUIRED_SELECTORS), (dir) => {
    const checked = assertDesignSystemCss({ outputDir: dir });
    assert.equal(checked.length, 1, 'should have read the one emitted stylesheet');
  });
});

test('fails when the .ts-scanned utilities are absent, naming every one and what it breaks', () => {
  // What a stale Tailwind scan actually produces: the .tsx-sourced utilities survive, every
  // selector that lives in a shared .ts class module is gone.
  withOutput('.flex{display:flex}', (dir) => {
    assert.throws(
      () => assertDesignSystemCss({ outputDir: dir }),
      (error) => {
        assert.match(
          error.message,
          new RegExp(`${REQUIRED_SELECTORS.length} of ${REQUIRED_SELECTORS.length} required`),
        );
        for (const [selector, consequence] of REQUIRED_SELECTORS) {
          assert.ok(error.message.includes(selector), `did not name ${selector}`);
          assert.ok(error.message.includes(consequence), `did not say what ${selector} breaks`);
        }
        // The message has to carry the remedy: whoever sees this is looking at a red deploy.
        assert.match(error.message, /stale build cache/);
        return true;
      },
    );
  });
});

test('fails on a single missing selector, not only when all of them are gone', () => {
  const [dropped, ...kept] = REQUIRED_SELECTORS;
  withOutput(stylesheet(kept), (dir) => {
    assert.throws(
      () => assertDesignSystemCss({ outputDir: dir }),
      (error) => {
        assert.match(error.message, new RegExp(`1 of ${REQUIRED_SELECTORS.length} required`));
        assert.ok(error.message.includes(dropped[0]), `did not name ${dropped[0]}`);
        return true;
      },
    );
  });
});

// The case the two tests above CANNOT produce. Both build their fixtures from REQUIRED_SELECTORS,
// so every class they write is an exact match — and a substring check passes those either way. The
// hole a substring check leaves is a LONGER class that merely contains an entry: one `.grow-0`
// anywhere in the scanned tree would satisfy the `.grow` entry forever, and the guard would report
// all clear on exactly the stale-scan build it exists to catch.
test('a longer class that merely contains a required selector does not satisfy it', () => {
  // `-0` is the shape Tailwind really produces: grow-0, border-primary/50, cursor-grabbing.
  const longer = REQUIRED_SELECTORS.map(([selector]) => `${selector}-0{color:red}`).join('\n');
  withOutput(longer, (dir) => {
    assert.throws(
      () => assertDesignSystemCss({ outputDir: dir }),
      (error) => {
        assert.match(
          error.message,
          new RegExp(`${REQUIRED_SELECTORS.length} of ${REQUIRED_SELECTORS.length} required`),
        );
        return true;
      },
    );
  });
});

// The other side of that boundary, and it is load-bearing: Tailwind emits a VARIANT utility with its
// condition attached — `.aria-pressed\:bg-primary[aria-pressed="true"]{…}` — so three of the entries
// never appear followed by `{` on a real build. The class is whole there and must still count.
test('the attribute form Tailwind emits for a variant utility still counts as present', () => {
  const asEmitted = REQUIRED_SELECTORS.map(
    ([selector]) => `${selector}[data-pressed]{color:red}`,
  ).join('\n');
  withOutput(asEmitted, (dir) => {
    const checked = assertDesignSystemCss({ outputDir: dir });
    assert.equal(checked.length, 1, 'should have read the one emitted stylesheet');
  });
});

test('fails when the build emitted no stylesheet at all', () => {
  withOutput(null, (dir) => {
    assert.throws(() => assertDesignSystemCss({ outputDir: dir }), /emitted no stylesheet/);
  });
});

test('fails when there is no build output to check, rather than passing vacuously', () => {
  assert.throws(
    () => assertDesignSystemCss({ outputDir: join(tmpdir(), 'assert-design-system-css-absent') }),
    /no build output/,
  );
});
