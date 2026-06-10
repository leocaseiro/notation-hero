import test from "node:test";
import assert from "node:assert/strict";
import { summarizeTake, PASS_THRESHOLD_PCT } from "./practiceSession.ts";
import { bootstrap } from "./main.ts";

test("summarizeTake marks an accurate take as passed", () => {
  const summary = summarizeTake({ lessonId: "fill-01", timingErrorsMs: [0, 10, -15, 25] });
  assert.equal(summary.score.accuracyPct, 100);
  assert.equal(summary.passed, true);
});

test("summarizeTake fails a take below threshold", () => {
  const summary = summarizeTake({ lessonId: "fill-02", timingErrorsMs: [300, 300, 0, 0] });
  assert.ok(summary.score.accuracyPct < PASS_THRESHOLD_PCT);
  assert.equal(summary.passed, false);
});

test("bootstrap renders one summary line per take", () => {
  const out = bootstrap([{ lessonId: "fill-01", timingErrorsMs: [0] }]);
  assert.match(out, /^fill-01: 100% \[PASS\]$/);
});
