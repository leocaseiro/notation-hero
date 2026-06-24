import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureChecklist } from "./pr-checklist-sync.mjs";
import { missingItems, stripNoise } from "./pr-checklist-lib.mjs";

const CANON = ["Item one.", "If this PR changed UI, I did X.", "Item three."];

test("appends all items, unticked, when body has no checklist; prose preserved", () => {
  const { body, appended } = ensureChecklist(
    "## What & why\nDid a thing.",
    CANON,
  );
  assert.equal(appended.length, 3);
  assert.match(body, /## What & why\nDid a thing\./); // prose untouched
  assert.match(body, /- \[ \] Item one\./);
  assert.equal(missingItems(stripNoise(body), CANON).length, 0); // parity with gate
});

test("no change when body already compliant (idempotent)", () => {
  const compliant =
    "## Checklist\n- [x] Item one.\n- [x] If this PR changed UI, I did X.\n- [x] Item three.";
  const { body, appended } = ensureChecklist(compliant, CANON);
  assert.equal(appended.length, 0);
  assert.equal(body, compliant);
});

test("drift: appends only the missing item and preserves existing ticks", () => {
  const partial =
    "## Checklist\n- [x] Item one.\n- [x] If this PR changed UI, I did X.";
  const { body, appended } = ensureChecklist(partial, CANON);
  assert.deepEqual(appended, ["Item three."]);
  assert.match(body, /- \[x\] Item one\./); // existing tick preserved
  assert.match(body, /- \[ \] Item three\./);
});

test("author's own unrelated checkboxes are not mistaken for canonical items", () => {
  const { appended } = ensureChecklist("## Notes\n- [x] my own todo\n", CANON);
  assert.equal(appended.length, 3); // all canonical still appended
});
