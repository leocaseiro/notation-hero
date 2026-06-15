#!/usr/bin/env node
// tooling/pr-checklist.mjs — NH-16 v1 "agent PR merge checklist" gate.
//
// Runs in CI on pull_request (see .github/workflows/ci.yml `pr-checklist` job).
// Two checks, both derived from the PR — no repo writes, no third-party action:
//
//   1. Jira key present — a real (NH|KAN)-<n> in the PR title, body, OR branch.
//      This is the ONE un-skippable check (cannot be N/A'd) — it guarantees every
//      PR is tracked, which is the whole point (agents merging ticketless).
//
//   2. No-blank-boxes — every checklist line in the PR body prefixed `required:`
//      or `warn:` must be ticked ([x]) OR marked N/A. A blank box ([ ]) fails the
//      gate, so a warning can't be silently ignored: it must be consciously
//      addressed (done, or a visible N/A). `required:` vs `warn:` is an intent
//      label for the reader; the gate treats both with the no-blank rule. Making
//      a non-Jira item hard-unskippable = v2 smart detection (see the spec).
//
// Bots (dependabot etc.) are skipped by the workflow `if:`; re-checked here too.
//
// Inputs (env, set from the github context in the workflow):
//   PR_TITLE, PR_BODY, PR_BRANCH, PR_AUTHOR_TYPE
//
// Exit 0 = pass, 1 = fail (with a human-readable report).
// Spec: docs/specs/2026-06-15-pr-merge-checklist.md · DACI L6.

const title = process.env.PR_TITLE ?? '';
const body = (process.env.PR_BODY ?? '').replace(/\r\n/g, '\n');
const branch = process.env.PR_BRANCH ?? '';
const authorType = process.env.PR_AUTHOR_TYPE ?? '';

const JIRA_RE = /\b(?:NH|KAN)-\d+\b/;
// Markdown task-list line → capture check state + the item text.
const TASK_RE = /^\s*[-*]\s*\[([ xX])\]\s*(.+?)\s*$/;
const PREFIX_RE = /^(required|warn)\s*:/i;
const NA_RE = /\bN\/A\b/i;

// Bot bypass (defensive — the workflow also gates on user.type).
if (authorType === 'Bot') {
  console.log('✅ pr-checklist: author is a bot — checklist gate skipped.');
  process.exit(0);
}

const fails = [];
const addressed = [];

// 1. Jira key presence — the un-skippable hard check.
if (![title, body, branch].some((s) => JIRA_RE.test(s))) {
  fails.push(
    'No Jira key found. Add a real NH-#### or KAN-#### to the PR title, body, or ' +
      'branch (e.g. "[NH-16] …" in the title, or a full URL in the body).',
  );
}

// 2. No-blank-boxes over prefixed checklist items.
for (const line of body.split('\n')) {
  const m = TASK_RE.exec(line);
  if (!m) continue;
  const text = m[2];
  const prefix = PREFIX_RE.exec(text);
  if (!prefix) continue; // only `required:`/`warn:` items are governed by the gate
  const checked = m[1].toLowerCase() === 'x';
  const severity = prefix[1].toLowerCase(); // 'required' | 'warn'
  if (checked || NA_RE.test(text)) {
    addressed.push(`${checked ? '[x]' : 'N/A'} ${text}`);
    continue;
  }
  fails.push(`Unaddressed ${severity}: item — tick it or mark N/A → "${text}"`);
}

if (fails.length > 0) {
  console.error('❌ pr-checklist failed:\n');
  for (const f of fails) console.error(`  • ${f}`);
  console.error(
    '\nFix: edit the PR description so a Jira key is present and every ' +
      '`required:`/`warn:` box is [x] or N/A. The gate re-runs when you edit the PR.',
  );
  process.exit(1);
}

console.log('✅ pr-checklist passed.');
for (const a of addressed) console.log(`  • ${a}`);
process.exit(0);
