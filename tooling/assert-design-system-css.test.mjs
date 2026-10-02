import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
// hole a substring check leaves is a LONGER class that merely contains an entry: one
// `.cursor-grabbing` anywhere in the scanned tree would satisfy the `.cursor-grab` entry forever,
// and the guard would report all clear on exactly the stale-scan build it exists to catch.
test('a longer class that merely contains a required selector does not satisfy it', () => {
  // A suffix is the shape Tailwind really produces: cursor-grabbing, bg-primary/90, border-2xl.
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

// The guard depends on a line in ANOTHER file, and nothing used to check it. web/app/globals.css
// keeps this repo's scripts out of Tailwind's automatic source detection; without it Tailwind
// scans the guard itself, extracts any utility spelled out in there, and GENERATES it — so the
// canary reports present on exactly the broken build it exists to catch.
//
// Measured by breaking the design-system scan and toggling the line: 9 of 10 entries reported
// missing with it, 6 of 10 without. On a HEALTHY build the toggle is invisible (0 of 10 either
// way, because removing it makes Tailwind generate MORE), which is why this is asserted as a
// text gate here rather than as a build experiment.
test("globals.css keeps this repo's scripts out of Tailwind source detection", () => {
  const css = readFileSync(join(import.meta.dirname, '..', 'web', 'app', 'globals.css'), 'utf8');
  assert.match(
    css,
    /^@source not '\.\.\/scripts\/\*\*';$/m,
    "web/app/globals.css must keep `@source not '../scripts/**';`. Without it Tailwind scans " +
      'web/scripts/, generates the utilities this guard watches for, and disarms the canaries — ' +
      'measured at 6 of 10 reported missing instead of 9 of 10.',
  );
});

// The sibling line, one folder over, and the same hazard: web/e2e/ discusses design-system class
// names in prose — the hit-area gate quotes `h-11`, the pixel shots quote `bg-rail` and
// `hover:bg-elevate`. Tailwind scans that folder too, so a utility named only in a COMMENT there
// becomes real CSS and the canary above passes over a utility the app itself stopped generating.
// Measured: an `mt-[137px]` planted in an a11y.e2e.ts comment reached the emitted stylesheet.
test("globals.css keeps this repo's e2e specs out of Tailwind source detection", () => {
  const css = readFileSync(join(import.meta.dirname, '..', 'web', 'app', 'globals.css'), 'utf8');
  assert.match(
    css,
    /^@source not '\.\.\/e2e\/\*\*';$/m,
    "web/app/globals.css must keep `@source not '../e2e/**';`. Without it Tailwind scans web/e2e/, " +
      'turns class names quoted in those specs into real CSS, and the canary above can no longer ' +
      'see a utility go missing from the app.',
  );
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
