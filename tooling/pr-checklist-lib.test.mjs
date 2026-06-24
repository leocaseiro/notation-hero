import { test } from "node:test";
import assert from "node:assert/strict";
import {
  missingItems,
  canonicalItems,
  parseTasks,
} from "./pr-checklist-lib.mjs";

test("missingItems returns canonical items not present in the body", () => {
  const canon = ["Alpha claim.", "Beta claim."];
  assert.deepEqual(missingItems("- [x] Alpha claim.", canon), ["Beta claim."]);
});

test("missingItems matches by normalized prefix (trailing detail allowed)", () => {
  const canon = ["Alpha claim."];
  assert.deepEqual(
    missingItems("- [ ] Alpha claim. (see src/foo.ts)", canon),
    [],
  );
});

test("parseTasks reads checked state and label text", () => {
  assert.deepEqual(parseTasks("- [x] done\n- [ ] todo"), [
    { checked: true, text: "done" },
    { checked: false, text: "todo" },
  ]);
});

test("canonicalItems reads every task line from the real PR template", () => {
  const items = canonicalItems();
  assert.ok(items.length >= 10);
  assert.ok(items.every((s) => typeof s === "string" && s.length > 0));
});
