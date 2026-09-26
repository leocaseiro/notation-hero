#!/usr/bin/env node
// Keeps the app-wide error-code registry and its documented twin honest.
//
// Three failures this catches, each of which has a cheap way to happen by accident:
//   1. Two codes with the same number — a copy-paste while adding a range.
//   2. A number reused for a second meaning, so an old bug report silently resolves to the wrong
//      case. Removing a code from the registry AND the reference page in one commit would leave the
//      two agreeing and the number free, which is why this check reads the base revision too
//      rather than trusting the current files alone.
//   3. The registry and the reference page listing different codes. That pairing used to be held
//      together by nothing but a comment asking people to change both.
//
// Runs in the `lint` job, not `quality`: `quality` is gated on the `code` paths filter, which does
// not include `docs/**`, so a pull request editing only the reference page would skip it entirely
// and pass green with a drifted table — half of what this gate is for.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** The registry's documented twin. One constant, so moving or archiving the page is a one-line
 *  repoint here rather than a hunt through the script. AGENTS.md says so too. */
export const REFERENCE_PAGE = 'docs/reference/error-codes.md';
/** The registry itself, read by repo-relative path — never by package name. Node refuses to strip
 *  types for anything it resolves under node_modules, so a package-name import throws
 *  ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING the moment the install is not symlinked. */
export const REGISTRY_FILE = 'shared/src/error-codes.ts';

// Constant literal regexes — never built from input, so no ReDoS surface.
const CODE_LITERAL = /'(E\d{3})'/g;
const TABLE_ROW_CODE = /^\|\s*(E\d{3})\s*\|/;
const RETIRED_HEADING = /^##\s+Retired\b/;
const ANY_HEADING = /^##\s+/;

/** Every code literal in registry source text. Used for the base revision, which exists only in
 *  git and so cannot be imported. */
export function codesInSource(source) {
  return [...source.matchAll(CODE_LITERAL)].map((match) => match[1]);
}

/** The reference page's codes, split by whether they sit under the Retired heading. */
export function codesInReferencePage(markdown) {
  const active = [];
  const retired = [];
  let inRetired = false;
  for (const line of markdown.split('\n')) {
    if (ANY_HEADING.test(line)) inRetired = RETIRED_HEADING.test(line);
    const row = TABLE_ROW_CODE.exec(line);
    if (row) (inRetired ? retired : active).push(row[1]);
  }
  return { active, retired };
}

/** Values appearing more than once. */
export function duplicates(codes) {
  const seen = new Set();
  const dupes = new Set();
  for (const code of codes) {
    if (seen.has(code)) dupes.add(code);
    seen.add(code);
  }
  return [...dupes].sort();
}

/** Members of `expected` absent from `actual`. */
export function missingFrom(expected, actual) {
  const have = new Set(actual);
  return [...new Set(expected)].filter((code) => !have.has(code)).sort();
}

/** Every number the base revision had allocated, live or retired. Empty when the registry did not
 *  exist there yet — which is the normal case on the branch that introduces it. */
export function allocatedAtBase(baseRef, registryPath = REGISTRY_FILE) {
  try {
    const source = execFileSync('git', ['show', `${baseRef}:${registryPath}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return codesInSource(source);
  } catch {
    return [];
  }
}

/** The commit this branch diverged from, or null when git cannot tell us. */
export function resolveBaseRef() {
  for (const ref of ['origin/master', 'master']) {
    try {
      return execFileSync('git', ['merge-base', 'HEAD', ref], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      continue;
    }
  }
  return null;
}

async function main() {
  const { ERROR, RETIRED_ERROR_CODES } = await import(
    pathToFileURL(new URL(`../${REGISTRY_FILE}`, import.meta.url).pathname).href
  );
  const live = Object.values(ERROR);
  const retired = [...RETIRED_ERROR_CODES];
  const page = codesInReferencePage(readFileSync(REFERENCE_PAGE, 'utf8'));
  const failures = [];

  const dupes = duplicates(live);
  if (dupes.length > 0) {
    failures.push(`${REGISTRY_FILE} uses the same number twice: ${dupes.join(', ')}.`);
  }

  const bothLiveAndRetired = live.filter((code) => retired.includes(code));
  if (bothLiveAndRetired.length > 0) {
    failures.push(
      `${bothLiveAndRetired.join(', ')} is listed as live AND retired. A retired number is spent.`,
    );
  }

  const pageMissing = missingFrom(live, page.active);
  if (pageMissing.length > 0) {
    failures.push(
      `${pageMissing.join(', ')} is in the registry but not in ${REFERENCE_PAGE}. Add a row.`,
    );
  }

  // A code on the page that the registry does not have is only allowed when it is retired: a
  // retired row stays visible so an old report still resolves.
  const registryMissing = missingFrom(page.active, live);
  if (registryMissing.length > 0) {
    failures.push(
      `${registryMissing.join(', ')} is listed as active in ${REFERENCE_PAGE} but is not in the registry. ` +
        'Remove the row, or move it to Retired and add the number to RETIRED_ERROR_CODES.',
    );
  }

  const retiredRowsMissing = missingFrom(retired, page.retired);
  if (retiredRowsMissing.length > 0) {
    failures.push(
      `${retiredRowsMissing.join(', ')} is in RETIRED_ERROR_CODES but has no row under Retired in ${REFERENCE_PAGE}.`,
    );
  }

  const baseRef = resolveBaseRef();
  if (baseRef === null) {
    failures.push(
      'Could not resolve a base revision to compare against, so the never-reuse rule went ' +
        'unchecked. This check is fail-closed on purpose: a silent skip is how a spent number ' +
        'gets handed out again. Fetch enough history (actions/checkout with fetch-depth: 0).',
    );
  } else {
    const freed = missingFrom(allocatedAtBase(baseRef), [...live, ...retired]);
    if (freed.length > 0) {
      failures.push(
        `${freed.join(', ')} was allocated at ${baseRef.slice(0, 8)} and is now in neither the live ` +
          'nor the retired list, which frees the number for a second meaning. Add it to ' +
          'RETIRED_ERROR_CODES instead of deleting it.',
      );
    }
  }

  if (failures.length > 0) {
    console.error('✗ Error-code registry and reference page disagree:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(
    `Error codes OK — ${String(live.length)} live, ${String(retired.length)} retired, ` +
      `${REFERENCE_PAGE} in step, no number reused.`,
  );
}

// `process.argv[1]` is undefined when this module is imported by something that was not started
// from a file (`node --input-type=module -e`, some runners), and pathToFileURL throws on undefined.
// Guard it so importing the pure helpers is always side-effect-free.
const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  await main();
}
