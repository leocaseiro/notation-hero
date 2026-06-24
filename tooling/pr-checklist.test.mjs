// tooling/pr-checklist.test.mjs — node --test suite for the PR-checklist gate (NH-16).
// Co-located per AGENTS.md (no __tests__/). Spawns the gate as a child process with
// controlled env and asserts exit code + output. Canonical items are read from the live
// PR template so the suite tracks label changes instead of hard-coding them.
//
// v1.1 model (NH-16 hardening): every checklist item is a standing acknowledgement that
// MUST be ticked [x] — there is NO N/A and no required:/warn: severity. Plus the
// un-skippable Jira-key grep (NH|KAN). Deleting an item still fails (anti-deletion).

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./pr-checklist.mjs", import.meta.url));
const TEMPLATE = fileURLToPath(
  new URL("../.github/pull_request_template.md", import.meta.url),
);

function run(env) {
  try {
    const stdout = execFileSync("node", [SCRIPT], {
      env: {
        ...process.env,
        PR_TITLE: "",
        PR_BODY: "",
        PR_BRANCH: "",
        PR_AUTHOR_TYPE: "User",
        ...env,
      },
      encoding: "utf8",
    });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    return {
      code: e.status ?? 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
    };
  }
}

// Canonical items = EVERY task line in the template (no severity prefix in v1.1).
const TASK_RE = /^\s*[-*]\s*\[([ xX])\]\s*(.+?)\s*$/;
const canonical = readFileSync(TEMPLATE, "utf8")
  .split("\n")
  .map((l) => TASK_RE.exec(l))
  .filter(Boolean)
  .map((m) => m[2]);

const allTicked = () => canonical.map((label) => `- [x] ${label}`).join("\n");

test("sanity: template exposes several acknowledgement items", () => {
  assert.ok(canonical.length >= 5);
});

test("fails when no Jira key anywhere", () => {
  const r = run({
    PR_TITLE: "no key",
    PR_BODY: allTicked(),
    PR_BRANCH: "feature",
  });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /No Jira key/);
});

test("passes: key in title + all items ticked", () => {
  const r = run({
    PR_TITLE: "[NH-16] feat",
    PR_BODY: allTicked(),
    PR_BRANCH: "nh-16-x",
  });
  assert.equal(r.code, 0);
});

test("passes: key only in body", () => {
  const r = run({
    PR_TITLE: "feat",
    PR_BODY: `${allTicked()}\nCloses NH-16`,
    PR_BRANCH: "feature",
  });
  assert.equal(r.code, 0);
});

test("passes: key only in branch (KAN- accepted too in code)", () => {
  const r = run({
    PR_TITLE: "feat",
    PR_BODY: allTicked(),
    PR_BRANCH: "KAN-9-x",
  });
  assert.equal(r.code, 0);
});

test("bot bypass: PR_AUTHOR_TYPE=Bot skips the gate", () => {
  const r = run({
    PR_TITLE: "bump",
    PR_BODY: "",
    PR_BRANCH: "dependabot/x",
    PR_AUTHOR_TYPE: "Bot",
  });
  assert.equal(r.code, 0);
});

test("fails: a single box left blank", () => {
  const body = canonical
    .map((label, i) => `- [${i === 0 ? " " : "x"}] ${label}`)
    .join("\n");
  const r = run({ PR_TITLE: "[NH-16] x", PR_BODY: body, PR_BRANCH: "nh-16-x" });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Unticked/);
});

test('v1.1: N/A is no longer honored — a blank box with "N/A" appended still fails', () => {
  const body = canonical
    .map((label, i) =>
      i === 0 ? `- [ ] ${label} — N/A: not applicable` : `- [x] ${label}`,
    )
    .join("\n");
  const r = run({ PR_TITLE: "[NH-16] x", PR_BODY: body, PR_BRANCH: "nh-16-x" });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Unticked/);
});

test("anti-deletion: deleting one item fails (no delete-the-checklist bypass)", () => {
  const body = canonical
    .slice(1)
    .map((label) => `- [x] ${label}`)
    .join("\n");
  const r = run({ PR_TITLE: "[NH-16] x", PR_BODY: body, PR_BRANCH: "nh-16-x" });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Missing checklist item/);
});

test("anti-deletion: empty / checklist-less body fails", () => {
  const r = run({
    PR_TITLE: "[NH-16] x",
    PR_BODY: "just a description",
    PR_BRANCH: "nh-16-x",
  });
  assert.equal(r.code, 1);
});

test("fenced sample checklist does not false-fail a compliant PR", () => {
  const body = `${allTicked()}\n\nExample for docs:\n\`\`\`\n- [ ] sample item\n\`\`\``;
  const r = run({ PR_TITLE: "[NH-16] x", PR_BODY: body, PR_BRANCH: "nh-16-x" });
  assert.equal(r.code, 0);
});

test("uppercase [X] counts as ticked", () => {
  const body = canonical.map((label) => `- [X] ${label}`).join("\n");
  const r = run({ PR_TITLE: "[NH-16] x", PR_BODY: body, PR_BRANCH: "nh-16-x" });
  assert.equal(r.code, 0);
});

// NH-206 review #3 — diff-aware infra-preview safety-net (PR_INFRA_CHANGED from paths-filter).
const PREVIEW_SECTION =
  "\n\n## Pulumi preview\n\nsafe — only creates, no destructive/exposure change\n";

test('infra gate: infra-changed + no "## Pulumi preview" section fails', () => {
  const r = run({
    PR_TITLE: "[NH-16] x",
    PR_BODY: allTicked(),
    PR_BRANCH: "nh-16-x",
    PR_INFRA_CHANGED: "true",
  });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Pulumi preview/);
});

test('infra gate: infra-changed + empty "## Pulumi preview" section fails', () => {
  const r = run({
    PR_TITLE: "[NH-16] x",
    PR_BODY: `${allTicked()}\n\n## Pulumi preview\n`,
    PR_BRANCH: "nh-16-x",
    PR_INFRA_CHANGED: "true",
  });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /empty/);
});

test("infra gate: infra-changed + filled section passes", () => {
  const r = run({
    PR_TITLE: "[NH-16] x",
    PR_BODY: allTicked() + PREVIEW_SECTION,
    PR_BRANCH: "nh-16-x",
    PR_INFRA_CHANGED: "true",
  });
  assert.equal(r.code, 0);
});

test("infra gate: infra UNchanged does not require the section", () => {
  const r = run({
    PR_TITLE: "[NH-16] x",
    PR_BODY: allTicked(),
    PR_BRANCH: "nh-16-x",
    PR_INFRA_CHANGED: "false",
  });
  assert.equal(r.code, 0);
});
