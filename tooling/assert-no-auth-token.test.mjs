import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { tokenLeakReport } from '../web/scripts/assert-no-auth-token.mjs';

const SCRIPT = fileURLToPath(new URL('../web/scripts/assert-no-auth-token.mjs', import.meta.url));

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

/**
 * Runs a copy of the real script from `<root>/web/scripts/` exactly as web's build script does —
 * `node scripts/assert-no-auth-token.mjs`, from inside web/ — with `token` in its environment. The
 * script finds web/ from its own location, so the copy reads the temp tree. The relative path
 * matters: the temp folder sits behind a symlink on macOS (/var is /private/var), and the script's
 * entry check never matches an ABSOLUTE path through a symlink, so it would exit 0 having checked
 * nothing. Node's working directory is always the real path, so the build's relative form is safe.
 */
const runCopy = (root, token) => {
  const web = join(root, 'web');
  mkdirSync(join(web, 'scripts'), { recursive: true });
  copyFileSync(SCRIPT, join(web, 'scripts/assert-no-auth-token.mjs'));
  return spawnSync(process.execPath, ['scripts/assert-no-auth-token.mjs'], {
    cwd: web,
    env: { ...process.env, SENTRY_AUTH_TOKEN: token },
    encoding: 'utf8',
  });
};

const CLEAN_WEB = Object.fromEntries(
  Object.entries(CLEAN).map(([file, text]) => [`web/${file}`, text]),
);

test('run as the build runs it, a token in public/ exits 1, naming the file but never the value', () => {
  withWeb({ ...CLEAN_WEB, 'web/public/leak.txt': `before ${TOKEN} after` }, (root) => {
    const run = runCopy(root, TOKEN);
    assert.equal(run.status, 1, `exit ${run.status}; stderr: ${run.stderr}`);
    assert.ok(
      run.stderr.includes('public/leak.txt'),
      `stderr does not name the file: ${run.stderr}`,
    );
    assert.ok(!`${run.stdout}${run.stderr}`.includes(TOKEN), 'the output holds the token itself');
  });
});

test('run as the build runs it, a clean tree with a token exits 0', () => {
  withWeb(CLEAN_WEB, (root) => {
    const run = runCopy(root, TOKEN);
    assert.equal(run.status, 0, run.stderr);
  });
});
