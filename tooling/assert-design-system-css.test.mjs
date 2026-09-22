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
