// tooling/check-machine-paths.test.mjs — node --test suite for the machine-path gate.
// Co-located per AGENTS.md (no __tests__/). Each case seeds one leak the gate exists to catch.
//
// The last case is the one that matters most: it builds a throwaway git repository, commits a file
// containing a machine path, and runs the real gate against it, asserting a non-zero exit. A guard
// nobody has watched fail is a guard nobody knows works — every pattern below could be quietly
// broken by one stray character in a character class and the unit assertions alone would not say so.
//
// This file necessarily CONTAINS the very paths it tests for, which is why the gate excludes it by
// exact path; `the self-exclusion list is exactly two entries` below is what stops that exclusion
// being widened until it hides a real violation.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MACHINE_PATH_PATTERNS,
  SELF_EXCLUDED,
  filesToScan,
  machinePathsIn,
} from './check-machine-paths.mjs';

const SCRIPT = fileURLToPath(new URL('./check-machine-paths.mjs', import.meta.url));

test('a macOS home directory is reported', () => {
  const found = machinePathsIn('see /Users/someone/Sites/other-project/src/index.ts');
  assert.equal(found.length, 1);
  assert.match(found[0].label, /macOS home/);
});

test('a Linux home directory is reported, but a CI runner path is not', () => {
  assert.equal(machinePathsIn('at /home/someone/projects/thing').length, 1);
  assert.equal(machinePathsIn('the workspace is /home/runner/work/repo/repo').length, 0);
});

test('a Windows home directory is reported', () => {
  assert.equal(machinePathsIn(String.raw`open C:\Users\Someone\Documents\notes.md`).length, 1);
});

test('a personal folder under ~ is reported', () => {
  assert.equal(machinePathsIn('cloned at ~/Sites/some-reference-repo').length, 1);
  assert.equal(machinePathsIn('screenshot in ~/Downloads/shot.png').length, 1);
});

test('an agent session-directory slug is reported', () => {
  const found = machinePathsIn(
    '~/.claude/projects/-Users-someone-Sites-thing--claude-worktrees-wt/a.jsonl',
  );
  assert.ok(found.length >= 1);
  assert.ok(found.some((hit) => /session-directory slug/.test(hit.label)));
});

test('a per-user agent scratchpad directory is reported', () => {
  assert.ok(machinePathsIn('/private/tmp/claude-501/slug/uuid/scratchpad/').length >= 1);
});

test('an angle-bracket placeholder is NOT reported — docs may teach a path shape', () => {
  assert.deepEqual(machinePathsIn('put it in /Users/<your-name>/Sites/repo'), []);
  assert.deepEqual(machinePathsIn('run it from <alphatab-fork>/src/components'), []);
});

test('a repo-relative path is NOT reported', () => {
  assert.deepEqual(machinePathsIn('see docs/plans/2026-09-13-v0c-popovers-plan.md'), []);
  assert.deepEqual(machinePathsIn('cd .claude/worktrees/alphatab-spike'), []);
});

test('the reported line number is 1-indexed', () => {
  const found = machinePathsIn(['clean', 'still clean', 'now /Users/someone/Sites/x'].join('\n'));
  assert.equal(found.length, 1);
  assert.equal(found[0].line, 3);
});

test('a line tripping two patterns is reported once per pattern, since the fixes can differ', () => {
  const found = machinePathsIn('/Users/someone/.claude/projects/-Users-someone-Sites-repo/x.jsonl');
  assert.equal(found.length, 2);
});

test('every pattern carries a human label naming the leak', () => {
  for (const { label, re } of MACHINE_PATH_PATTERNS) {
    assert.ok(label.length > 0, `${re} has no label`);
    assert.ok(/^(a|an) /.test(label), `${label} should read as "a …"/"an …" in the error line`);
  }
});

test('the self-exclusion list is exactly two entries — widening it would hide real violations', () => {
  assert.deepEqual(SELF_EXCLUDED, [
    'tooling/check-machine-paths.mjs',
    'tooling/check-machine-paths.test.mjs',
  ]);
});

test('filesToScan drops the gate\u2019s own files and the lockfile, and keeps everything else', () => {
  const scanned = filesToScan([
    'docs/plans/a.md',
    'tooling/check-machine-paths.mjs',
    'tooling/check-machine-paths.test.mjs',
    'pnpm-lock.yaml',
    '',
  ]);
  assert.deepEqual(scanned, ['docs/plans/a.md']);
});

test('the gate FIRES: a planted machine path in a real repo exits non-zero and names the file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'machine-path-gate-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    writeFileSync(
      join(dir, 'clean.md'),
      'A repo-relative mention of docs/plans/thing.md is fine.\n',
    );
    // Assembled from fragments so this planted violation is the ONLY thing under test here, rather
    // than something a future reader might "tidy up" out of the fixture by accident.
    writeFileSync(join(dir, 'leaky.md'), `Prior art lives at ${'~/Sites'}/some-other-project.\n`);
    execFileSync('git', ['add', '.'], { cwd: dir });

    let code = 0;
    let stderr = '';
    try {
      execFileSync('node', [SCRIPT], { cwd: dir, encoding: 'utf8' });
    } catch (e) {
      code = e.status ?? 1;
      stderr = e.stderr ?? '';
    }

    assert.equal(code, 1, 'the gate must exit non-zero on a planted machine path');
    assert.match(stderr, /leaky\.md:1/, 'the failure must name the offending file and line');
    assert.doesNotMatch(stderr, /clean\.md/, 'the clean file must not be reported');
    assert.match(stderr, /personal folder/, 'the failure must say which kind of leak it found');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the gate PASSES a repo with no machine paths', () => {
  const dir = mkdtempSync(join(tmpdir(), 'machine-path-gate-ok-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    writeFileSync(join(dir, 'clean.md'), 'See docs/plans/thing.md and .claude/worktrees/wt.\n');
    execFileSync('git', ['add', '.'], { cwd: dir });

    const stdout = execFileSync('node', [SCRIPT], { cwd: dir, encoding: 'utf8' });
    assert.match(stdout, /Machine-path guard OK/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
