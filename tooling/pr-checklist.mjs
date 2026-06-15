#!/usr/bin/env node
// tooling/pr-checklist.mjs — NH-16 v1 "agent PR merge checklist" gate (hardened).
//
// Runs in CI on pull_request (see .github/workflows/ci.yml `pr-checklist` job).
// Three checks, all derived from the PR — no repo writes, no third-party action:
//
//   1. Jira key — a real (NH|KAN)-<n> in the PR title, body, OR branch. The body is
//      searched with HTML comments and ``` / ~~~ code fences stripped, so a key hidden
//      in a comment or a quoted sample does not count. This is the ONE un-skippable check.
//
//   2. Checklist presence (anti-deletion) — the canonical `required:`/`warn:` items are
//      read from .github/pull_request_template.md (the source of truth). EVERY canonical
//      item must appear in the PR body; deleting or renaming items FAILS the gate, so an
//      author can't delete the checklist to pass.
//
//   3. No-blank-boxes — each canonical item must be ticked [x] OR skipped by writing the
//      literal token N/A in the author-added text AFTER the item label (never the label
//      itself, so a label that happens to contain "N/A" can't auto-pass a blank box).
//      Comments and fences are stripped first, so quoted samples don't cause false-fails.
//
// `required:` vs `warn:` is an intent label for the reader; the gate treats both the same
// (presence + no-blank). Bots (dependabot etc.) are skipped by the workflow `if:` and here.
// Fails CLOSED: any uncaught error exits non-zero, which ci-green treats as failure.
//
// Inputs (env, set from the github context in the workflow):
//   PR_TITLE, PR_BODY, PR_BRANCH, PR_AUTHOR_TYPE
// Exit 0 = pass, 1 = fail (human-readable report).
// Spec: docs/specs/2026-06-15-pr-merge-checklist.md · DACI L6.

import { readFileSync } from 'node:fs';

const title = process.env.PR_TITLE ?? '';
const rawBody = (process.env.PR_BODY ?? '').replace(/\r\n?/g, '\n'); // CRLF and lone CR
const branch = process.env.PR_BRANCH ?? '';
const authorType = process.env.PR_AUTHOR_TYPE ?? '';

const JIRA_RE = /\b(?:NH|KAN)-\d+\b/;
const TASK_RE = /^\s*[-*]\s*\[([ xX])\]\s*(.+?)\s*$/;
const PREFIX_RE = /^(required|warn)\s*:/i;
const NA_RE = /\bN\/A\b/i;

// Bot bypass (defensive — the workflow also gates on user.type).
if (authorType === 'Bot') {
  console.log('✅ pr-checklist: author is a bot — checklist gate skipped.');
  process.exit(0);
}

// Strip HTML comments and fenced code blocks so keys/checkboxes hidden in comments or
// quoted samples are ignored — no false-pass on a commented key, no false-fail on a sample.
const stripNoise = (s) =>
  s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '');

const body = stripNoise(rawBody);
// For the key search, also drop checklist lines so a template EXAMPLE key inside an item
// label (e.g. the "[NH-16] …" sample) can't satisfy the requirement — the real key must be
// in the title, branch, or a prose line like "Closes [NH-16](url)".
const bodyForKey = body
  .split('\n')
  .filter((l) => !TASK_RE.test(l))
  .join('\n');

// Normalize for matching: collapse whitespace, lowercase.
const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();

// Canonical required:/warn: item labels, read from the committed PR template.
function canonicalItems() {
  const tpl = readFileSync(
    new URL('../.github/pull_request_template.md', import.meta.url),
    'utf8',
  );
  const items = [];
  for (const line of tpl.split('\n')) {
    const m = TASK_RE.exec(line);
    if (m && PREFIX_RE.test(m[2])) items.push(m[2]);
  }
  return items;
}

let canonical;
try {
  canonical = canonicalItems();
} catch (err) {
  console.error(
    '❌ pr-checklist: could not read .github/pull_request_template.md — ' + err.message,
  );
  process.exit(1);
}

const fails = [];
const addressed = [];

// 1. Jira key presence (un-skippable; comments/fences/checklist lines excluded).
if (![title, bodyForKey, branch].some((s) => JIRA_RE.test(s))) {
  fails.push(
    'No Jira key found. Add a real NH-#### or KAN-#### to the PR title, body, or branch ' +
      '(e.g. "[NH-16] …" in the title, or a full URL in the body).',
  );
}

// Index the body's checkbox lines.
const bodyTasks = [];
for (const line of body.split('\n')) {
  const m = TASK_RE.exec(line);
  if (m) bodyTasks.push({ checked: m[1].toLowerCase() === 'x', text: m[2] });
}

// 2 + 3. Every canonical item must be present AND addressed.
for (const label of canonical) {
  const nlabel = norm(label);
  const match = bodyTasks.find((t) => norm(t.text).startsWith(nlabel));
  if (!match) {
    fails.push(`Missing checklist item — restore it from the PR template: "${label}"`);
    continue;
  }
  // N/A is honored only in the author-added remainder AFTER the canonical label.
  const remainder = norm(match.text).slice(nlabel.length);
  if (match.checked || NA_RE.test(remainder)) {
    addressed.push(`${match.checked ? '[x]' : 'N/A'} ${label}`);
    continue;
  }
  const severity = (PREFIX_RE.exec(label)?.[1] ?? 'warn').toLowerCase();
  fails.push(
    `Unaddressed ${severity}: item — tick it [x] or append "— N/A: reason" → "${label}"`,
  );
}

if (fails.length > 0) {
  console.error('❌ pr-checklist failed:\n');
  for (const f of fails) console.error(`  • ${f}`);
  console.error(
    '\nFix: run `gh pr edit --body "…"` (or edit on GitHub) so a real NH-/KAN- key is ' +
      'present and every required:/warn: item from the template is ticked [x] or appended ' +
      'with the literal token "N/A: reason". Editing the PR re-runs this gate automatically.',
  );
  process.exit(1);
}

console.log('✅ pr-checklist passed.');
for (const a of addressed) console.log(`  • ${a}`);
process.exit(0);
