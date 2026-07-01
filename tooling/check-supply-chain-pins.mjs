#!/usr/bin/env node
// Guards the EXACT-VERSION pins in pnpm-workspace.yaml (trustPolicyExclude +
// minimumReleaseAgeExclude) against pnpm-lock.yaml. Those excludes exempt specific
// transitive versions from pnpm's `trustPolicy: no-downgrade` / `minimumReleaseAge`
// gates (NH-259). They are version-exact, so when the lockfile bumps a pinned
// transitive (e.g. semver@6.3.1 -> 6.3.2) the exclude silently stops matching and the
// gate re-trips, breaking `pnpm install --frozen-lockfile` in every CI job with no
// breadcrumb back to this file. This check fails early and names the stale pin.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const EXCLUDE_KEYS = new Set(['minimumReleaseAgeExclude', 'trustPolicyExclude']);
// Constant literal regexes (never built from input — no ReDoS surface).
const KEY_LINE = /^([A-Za-z]+):[ \t]*$/;
const LIST_ITEM = /^[ \t]+-[ \t]+['"]?([^'"\n]+?)['"]?[ \t]*$/;
const NAME_CHAR = /[\w@/.-]/; // a package-name character
const VERSION_TAIL = /[\w.-]/; // a version-continuation character

// Extract the `name@version` specs listed under each exclude key of pnpm-workspace.yaml.
export function extractPins(workspaceYaml) {
  const pins = [];
  let key = null;
  for (const line of workspaceYaml.split('\n')) {
    const keyMatch = KEY_LINE.exec(line);
    if (keyMatch) {
      key = EXCLUDE_KEYS.has(keyMatch[1]) ? keyMatch[1] : null;
      continue;
    }
    if (!key) continue;
    const item = LIST_ITEM.exec(line);
    if (item) pins.push({ key, spec: item[1].trim() });
    // A `#` comment inside the block must not truncate it (would drop pins after it — fail-open).
    else if (line.trim() !== '' && !line.trimStart().startsWith('#')) key = null;
  }
  return pins;
}

// A pin is stale when its exact `name@version` is absent from the lockfile text.
export function findStalePins(pins, lockfile) {
  return pins.filter(({ spec }) => !lockfileHasExact(lockfile, spec));
}

// Substring search with token boundaries (no dynamic RegExp — avoids a ReDoS surface),
// so `semver@6.3.1` does not match `semver@6.3.10` or a longer package name.
function lockfileHasExact(lockfile, spec) {
  for (let i = lockfile.indexOf(spec); i !== -1; i = lockfile.indexOf(spec, i + 1)) {
    const before = i === 0 ? '' : lockfile[i - 1];
    const after = lockfile[i + spec.length] ?? '';
    if ((before === '' || !NAME_CHAR.test(before)) && (after === '' || !VERSION_TAIL.test(after))) {
      return true;
    }
  }
  return false;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ws = readFileSync('pnpm-workspace.yaml', 'utf8');
  const lock = readFileSync('pnpm-lock.yaml', 'utf8');
  const pins = extractPins(ws);
  const stale = findStalePins(pins, lock);
  if (stale.length > 0) {
    console.error(
      '✗ Stale supply-chain pins in pnpm-workspace.yaml (not found in pnpm-lock.yaml):',
    );
    for (const { key, spec } of stale) console.error(`    ${key}: ${spec}`);
    console.error(
      "\nThe lockfile bumped these transitives, so the version-exact exclude no longer matches and pnpm's\n" +
        'no-downgrade / minimumReleaseAge will re-trip on install (NH-259). Re-sync each pin to the version\n' +
        'now in pnpm-lock.yaml (grep the package name there), then re-run `pnpm run check:supply-chain-pins`.',
    );
    process.exit(1);
  }
  console.log(`✓ ${pins.length} supply-chain pins in sync with pnpm-lock.yaml`);
}
