import test from "node:test";
import assert from "node:assert/strict";
import { classifyHit, scorePassage, DEFAULT_WINDOWS } from "./accuracy.ts";

test("classifyHit: a dead-on hit is perfect", () => {
  assert.equal(classifyHit(0), "perfect");
  assert.equal(classifyHit(DEFAULT_WINDOWS.perfectMs), "perfect");
});

test("classifyHit: distinguishes early from late beyond the good band", () => {
  // early/late is the OUTER band: magnitude strictly between goodMs(50) and
  // hittableMs(120). ±40 falls inside the good band, so use ±80.
  assert.equal(classifyHit(-80), "early");
  assert.equal(classifyHit(80), "late");
  // boundary lock: ±goodMs(50) is still "good"; ±51 crosses into early/late.
  assert.equal(classifyHit(50), "good");
  assert.equal(classifyHit(-50), "good");
  assert.equal(classifyHit(-51), "early");
  assert.equal(classifyHit(51), "late");
});

test("classifyHit: beyond the hittable window is a miss", () => {
  assert.equal(classifyHit(DEFAULT_WINDOWS.hittableMs + 1), "miss");
});

test("scorePassage: mixes hits and misses into a rounded percentage", () => {
  const result = scorePassage([0, 30, 200, -10]); // perfect, good, miss, perfect
  assert.equal(result.total, 4);
  assert.equal(result.hits, 3);
  assert.equal(result.misses, 1);
  assert.equal(result.accuracyPct, 75);
});

test("scorePassage: empty passage is 0% over 0 notes, no NaN", () => {
  const result = scorePassage([]);
  assert.equal(result.total, 0);
  assert.equal(result.accuracyPct, 0);
});
