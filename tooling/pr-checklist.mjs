#!/usr/bin/env node
// tooling/pr-checklist.mjs — NH-16 "agent PR merge checklist" gate (v1.1).
//
// Runs in CI on pull_request (see .github/workflows/ci.yml `pr-checklist` job).
// Two checks, both derived from the PR — no repo writes, no third-party action:
//
//   1. Jira key — a real (NH|KAN)-<n> in the PR title, body, OR branch. The body is
//      searched with HTML comments and ``` / ~~~ code fences stripped, so a key hidden
//      in a comment or a quoted sample does not count. Un-skippable.
//
//   2. Acknowledgement checklist — the canonical items are read from
//      .github/pull_request_template.md (the source of truth). EVERY canonical item must
//      appear in the PR body AND be ticked [x]. Deleting or rewording an item FAILS the
//      gate (so an author can't delete the checklist to pass). There is NO N/A escape:
//      the items are standing acknowledgements, phrased to stay true whether or not their
//      condition applies, so they are always tickable. Any blank box fails the gate.
//
// `required:`/`warn:` severity and the `N/A` skip marker were removed in v1.1 — the user's
// model is "every box is an agreement you tick; no checked, no merge." (See spec.)
//
// Bots (dependabot etc.) are skipped by the workflow `if:` and here. Fails CLOSED: any
// uncaught error exits non-zero, which ci-green treats as failure.
//
// Inputs (env, set from the github context in the workflow):
//   PR_TITLE, PR_BODY, PR_BRANCH, PR_AUTHOR_TYPE
// Exit 0 = pass, 1 = fail (human-readable report).
// Spec: docs/specs/2026-06-15-pr-merge-checklist.md · DACI L6.

import { TASK_RE, stripNoise, norm, canonicalItems, parseTasks } from './pr-checklist-lib.mjs';

const title = process.env.PR_TITLE ?? '';
const rawBody = (process.env.PR_BODY ?? '').replace(/\r\n?/g, '\n'); // CRLF and lone CR
const branch = process.env.PR_BRANCH ?? '';
const authorType = process.env.PR_AUTHOR_TYPE ?? '';

const JIRA_RE = /\b(?:NH|KAN)-\d+\b/;

// Bot bypass (defensive — the workflow also gates on user.type).
if (authorType === 'Bot') {
  console.log('✅ pr-checklist: author is a bot — checklist gate skipped.');
  process.exit(0);
}

const body = stripNoise(rawBody);
// For the key search, also drop checklist lines so a template EXAMPLE key inside an item
// label can't satisfy the requirement — the real key must be in the title, branch, or a
// prose line like "Closes [NH-16](url)".
const bodyForKey = body
  .split('\n')
  .filter((l) => !TASK_RE.test(l))
  .join('\n');

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
    'No Jira key found. Add a real NH-#### (or KAN-####) to the PR title, body, or branch ' +
      '(e.g. "[NH-16] …" in the title, or a full URL in the body).',
  );
}

// Index the body's checkbox lines (noise already stripped).
const bodyTasks = parseTasks(body);

// 2. Every canonical item must be present AND ticked [x]. No N/A.
for (const label of canonical) {
  const nlabel = norm(label);
  const match = bodyTasks.find((t) => norm(t.text).startsWith(nlabel));
  if (!match) {
    fails.push(`Missing checklist item — restore it verbatim from the PR template: "${label}"`);
    continue;
  }
  if (match.checked) {
    addressed.push(`[x] ${label}`);
    continue;
  }
  fails.push(`Unticked item — tick it [x] before merging: "${label}"`);
}

// 3. Diff-aware infra-preview evidence (NH-206 review #3). The PR-triggered `pulumi preview`
//    was removed (it ran arbitrary infra/*.ts under the deploy role); the agent records the
//    LOCAL preview result instead. When the PR diff touches infra/ (PR_INFRA_CHANGED=true, set
//    from the `changes` paths-filter), the body MUST carry a non-empty "## Pulumi preview"
//    section (classification only). See AGENTS.md "Infra changes — local-preview safety-net".
if (process.env.PR_INFRA_CHANGED === 'true') {
  const lines = body.split('\n');
  const idx = lines.findIndex((l) => /^##\s+pulumi preview\b/i.test(l));
  if (idx === -1) {
    fails.push(
      'This PR changes infra/, but the body has no "## Pulumi preview" section. Add it and ' +
        'record the local `pulumi preview` classification (safe, or destructive/exposure + a task).',
    );
  } else {
    let content = '';
    for (let i = idx + 1; i < lines.length && !/^##\s/.test(lines[i]); i++) content += lines[i];
    if (content.trim() === '') {
      fails.push(
        'This PR changes infra/, but the "## Pulumi preview" section is empty. Record the local ' +
          '`pulumi preview` classification there (NH-206 review #3 safety-net).',
      );
    } else {
      addressed.push('[x] infra/: pulumi preview recorded under "## Pulumi preview"');
    }
  }
}

if (fails.length > 0) {
  console.error('❌ pr-checklist failed:\n');
  for (const f of fails) console.error(`  • ${f}`);
  console.error(
    '\nFix: edit the PR (on GitHub or `gh pr edit`) so a real NH-/KAN- key is present and ' +
      'EVERY checklist item from the template is ticked [x]. There is no N/A — the items are ' +
      'standing acknowledgements, so tick them all. Editing the PR re-runs this gate.',
  );
  process.exit(1);
}

console.log('✅ pr-checklist passed — Jira key present and all acknowledgements ticked.');
for (const a of addressed) console.log(`  • ${a}`);
process.exit(0);
