import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { VENDOR_FILES, vendorAlphaTab } from '../web/scripts/vendor-alphatab.mjs';

const DIST = new URL('../web/node_modules/@coderline/alphatab/dist/', import.meta.url).pathname;

test('copies the minified ESM under PLAIN names so the core import resolves to the minified core', () => {
  const out = mkdtempSync(join(tmpdir(), 'vendor-alphatab-'));
  try {
    vendorAlphaTab({ dist: DIST, out });

    // alphaTab.min.mjs imports './alphaTab.core.mjs'. If the minified core landed under a
    // '.min' name the browser would fetch the 2.3 MB unminified core instead, so assert both
    // the plain filename AND that the bytes are the minified build (roughly half the size).
    const entry = readFileSync(join(out, 'esm/alphaTab.mjs'), 'utf8');
    assert.match(entry, /alphaTab\.core\.mjs/);

    const core = statSync(join(out, 'esm/alphaTab.core.mjs'));
    assert.ok(core.size < 1_500_000, `core is ${core.size} bytes — that is the unminified build`);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('copies every declared file, including the worker, worklet, soundfont, font and licences', () => {
  const out = mkdtempSync(join(tmpdir(), 'vendor-alphatab-'));
  try {
    const copied = vendorAlphaTab({ dist: DIST, out });

    assert.deepEqual([...copied].sort(), [...VENDOR_FILES.map(([, to]) => to)].sort());
    for (const [, to] of VENDOR_FILES) {
      assert.ok(statSync(join(out, to)).size > 0, `${to} is empty`);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('fails loudly when a source file is missing rather than shipping a broken public/', () => {
  const out = mkdtempSync(join(tmpdir(), 'vendor-alphatab-'));
  try {
    assert.throws(
      () => vendorAlphaTab({ dist: join(out, 'does-not-exist'), out }),
      /missing source/,
    );
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
