import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { tokenLeakReport } from '../web/scripts/assert-no-auth-token.mjs';

// A fake. The real token never appears in a test, a fixture or a log.
const TOKEN = 'fake-sentry-token-for-the-leak-check';

/** A temp web/ folder holding `files`, laid out the way `next build` and public/ hold them. */
const withWeb = (files, run) => {
  const root = mkdtempSync(join(tmpdir(), 'assert-no-auth-token-'));
  try {
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(join(root, dirname(file)), { recursive: true });
      writeFileSync(join(root, file), text);
    }
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const CLEAN = {
  '.next/static/chunks/app.js': 'console.log("hello")',
  '.next/server/app/play.html': '<html><body>Player</body></html>',
  '.next/server/pages/404.html': '<html><body>Not found</body></html>',
  'public/notation/1-beat.gp': 'bytes',
};

test('passes when no browser file holds the token', () => {
  withWeb(CLEAN, (root) => assert.equal(tokenLeakReport({ token: TOKEN, root }), null));
});

test('has nothing to check when the build has no token', () => {
  withWeb({ ...CLEAN, '.next/static/chunks/leak.js': `const t = "${TOKEN}";` }, (root) => {
    assert.equal(tokenLeakReport({ token: undefined, root }), null);
    assert.equal(tokenLeakReport({ token: '', root }), null);
  });
});

for (const file of [
  '.next/static/chunks/leak.js',
  '.next/server/app/play.html',
  '.next/server/app/play.rsc',
  'public/leak.txt',
]) {
  test(`fails on the token in ${file}, naming the file but never the value`, () => {
    withWeb({ ...CLEAN, [file]: `before ${TOKEN} after` }, (root) => {
      const report = tokenLeakReport({ token: TOKEN, root });
      assert.ok(report !== null, 'the leak was not found');
      assert.ok(report.includes(file), `the report does not name ${file}`);
      assert.ok(!report.includes(TOKEN), 'the report holds the token itself');
    });
  });
}

test('does not read the build cache, which no browser downloads', () => {
  withWeb({ ...CLEAN, '.next/cache/fetch-cache/entry': TOKEN }, (root) => {
    assert.equal(tokenLeakReport({ token: TOKEN, root }), null);
  });
});

test('run as a script with no token, it exits 0', () => {
  const run = spawnSync(process.execPath, ['web/scripts/assert-no-auth-token.mjs'], {
    env: { ...process.env, SENTRY_AUTH_TOKEN: '' },
    encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stderr);
});
