import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryUserProgress } from "./inMemoryUserProgress.ts";
import type { UserProgress } from "./userProgressPort.ts";

const sample: UserProgress = {
  userId: "u1",
  lessonId: "paradiddle-01",
  bestAccuracyPct: 82.5,
  updatedAt: "2026-06-10T00:00:00.000Z",
};

test("put then get round-trips the record", async () => {
  const repo = new InMemoryUserProgress();
  await repo.put(sample);
  assert.deepEqual(await repo.get("u1", "paradiddle-01"), sample);
});

test("get returns undefined for an unknown key", async () => {
  const repo = new InMemoryUserProgress();
  assert.equal(await repo.get("nobody", "nothing"), undefined);
});

test("put is last-write-wins on the same key", async () => {
  const repo = new InMemoryUserProgress();
  await repo.put(sample);
  await repo.put({ ...sample, bestAccuracyPct: 95 });
  const got = await repo.get("u1", "paradiddle-01");
  assert.equal(got?.bestAccuracyPct, 95);
});
