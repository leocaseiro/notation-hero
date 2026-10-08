#!/usr/bin/env node
// Keeps one maintainer's folder layout out of a public repository.
//
// The GitHub handle is unavoidably public — CODEOWNERS, the pull-request template and the repo URL
// all need it — so the handle is not what this guards. The LAYOUT is: which folder the checkout sits
// in, what else is cloned beside it, and the numeric user id baked into an agent scratchpad path. A
// handoff doc that says `~/Sites/tablatures` tells a reader what other projects are on the disk, and
// `~/Sites/notation-hero-resources` names a private one. None of that helps anyone reading the repo.
//
// It is a class that comes back on its own, because every agent handoff, spike writeup and review
// artifact is authored from inside a worktree whose absolute path is right there in the prompt. The
// sweep that prompted this gate found 270 such lines across 66 tracked files.
//
// Runs in the `lint` job, not `quality`: `quality` is gated on the `code` paths filter, which does
// not include `docs/**`. These lines land in docs-only pull requests almost every time, which is
// exactly the set of pull requests `quality` skips — so a guard living there would be a no-op for
// the changes it exists to catch.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** This file and its test necessarily CONTAIN the patterns — as regex source here, as planted
 *  violations there — so a repo-wide scan would flag them and the gate would fail on itself.
 *  Exact paths, never a glob over `tooling/`: widening this is how a real violation gets hidden in a
 *  neighbouring script. A test asserts this list still holds exactly these two entries. */
export const SELF_EXCLUDED = [
  'tooling/check-machine-paths.mjs',
  'tooling/check-machine-paths.test.mjs',
];

/** The lockfile carries registry URLs and integrity hashes, never prose; it is also enormous. */
const SKIPPED_PATHS = ['pnpm-lock.yaml'];

/** Constant literal regexes — never built from input, so no ReDoS surface.
 *
 *  `label` is what the failure message prints, because "machine path" alone does not tell an author
 *  what to write instead. Each one describes the leak, so the fix is obvious from the error.
 *
 *  Deliberately NOT banned:
 *   - `/Users/<your-name>/` and other angle-bracket placeholders — `<` is outside every character
 *     class below, so documentation that teaches a path shape still passes.
 *   - `/home/runner/` — a GitHub Actions runner, not a person's machine. Workflow docs need it.
 *   - `~/.claude/` on its own — the agent config directory is the same for everyone. Only the
 *     per-project `projects/-Users-…-` slug underneath it identifies a machine, and the session-slug
 *     pattern already catches that. */
export const MACHINE_PATH_PATTERNS = [
  { label: 'a macOS home directory', re: /\/Users\/[A-Za-z0-9._-]+\// },
  { label: 'a Linux home directory', re: /\/home\/(?!runner\/)[a-z0-9._-]+\// },
  { label: 'a Windows home directory', re: /[A-Za-z]:\\Users\\/ },
  {
    label: 'a personal folder under `~`',
    re: /~\/(?:Sites|Documents|Desktop|Downloads|Projects)\//,
  },
  { label: 'an agent session-directory slug', re: /-(?:Users|home)-[A-Za-z0-9]+-/ },
  { label: 'a per-user agent scratchpad directory', re: /\/tmp\/claude-\d+\// },
];

/** Every machine path in one file's text, as `{ line, label, text }` — `line` 1-indexed so the
 *  output pastes straight into an editor. A line tripping two patterns is reported once per pattern,
 *  because the two fixes can differ. */
export function machinePathsIn(content) {
  const found = [];
  content.split('\n').forEach((text, index) => {
    for (const { label, re } of MACHINE_PATH_PATTERNS) {
      if (re.test(text)) found.push({ line: index + 1, label, text: text.trim() });
    }
  });
  return found;
}

/** Tracked text files worth scanning, minus this gate's own two files and the lockfile. */
export function filesToScan(trackedPaths, excluded = [...SELF_EXCLUDED, ...SKIPPED_PATHS]) {
  return trackedPaths.filter((path) => path.length > 0 && !excluded.includes(path));
}

function main() {
  const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0');

  const violations = [];
  for (const path of filesToScan(tracked)) {
    let content;
    try {
      content = readFileSync(path, 'utf8');
    } catch {
      continue; // A deleted-but-staged path, or a binary blob readFileSync cannot decode.
    }
    if (content.includes('\0')) continue; // Binary; `git ls-files` does not say which is which.
    for (const hit of machinePathsIn(content)) violations.push({ path, ...hit });
  }

  if (violations.length > 0) {
    console.error(
      `::error::${violations.length} machine path(s) in tracked files. This repository is public.`,
    );
    console.error(
      'Describe the location instead of naming it. The handle is fine; the layout is not:',
    );
    console.error(
      '  `~/Sites/alphaTabWebsite (rhythm-game branch)` -> `the local alphaTab fork (rhythm-game branch)`',
    );
    console.error(
      'Repo-relative paths inside that project are fine to keep — only the machine part goes.',
    );
    console.error('See AGENTS.md, "Public repo — no personal data in committed files".');
    for (const { path, line, label, text } of violations) {
      console.error(`  - ${path}:${line} — ${label}`);
      console.error(`      ${text}`);
    }
    process.exit(1);
  }

  console.log(`Machine-path guard OK — scanned ${filesToScan(tracked).length} tracked files.`);
}

// `process.argv[1]` is undefined when this module is imported by something that was not started
// from a file (`node --input-type=module -e`, some runners), and pathToFileURL throws on undefined.
// Guard it so importing the pure helpers is always side-effect-free.
const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  main();
}
