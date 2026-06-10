/**
 * Pure drum-practice scoring domain. No I/O, no AWS, no framework imports.
 * @see docs/decisions/2026-06-09-tooling-stack-daci.md — L2 (type:core boundary)
 */

/** Verdict for a single struck note relative to its target beat. */
export type HitVerdict = "perfect" | "good" | "late" | "early" | "miss";

/** Tolerance windows (milliseconds) classifying a hit by timing error. */
export interface TimingWindows {
  readonly perfectMs: number;
  readonly goodMs: number;
  readonly hittableMs: number;
}

/** Default windows tuned for an intermediate drum-practice tempo. */
export const DEFAULT_WINDOWS: TimingWindows = {
  perfectMs: 20,
  goodMs: 50,
  hittableMs: 120,
};

/**
 * Classify one hit by the signed timing error (actual - target, ms).
 * Negative = early, positive = late. Outside `hittableMs` => "miss".
 */
export function classifyHit(errorMs: number, windows: TimingWindows = DEFAULT_WINDOWS): HitVerdict {
  // A non-finite timing error (NaN from a dropped/garbage sample, or ±Infinity)
  // is never a real hit — treat it as a miss so it can't inflate accuracy.
  if (!Number.isFinite(errorMs)) {
    return "miss";
  }
  const magnitude: number = Math.abs(errorMs);
  if (magnitude > windows.hittableMs) {
    return "miss";
  }
  if (magnitude <= windows.perfectMs) {
    return "perfect";
  }
  if (magnitude <= windows.goodMs) {
    return "good";
  }
  return errorMs < 0 ? "early" : "late";
}

/** Aggregate accuracy result for a practiced passage. */
export interface AccuracyScore {
  readonly total: number;
  readonly hits: number;
  readonly misses: number;
  /** 0..100, rounded to one decimal place. */
  readonly accuracyPct: number;
}

/**
 * Score a passage from each note's signed timing error.
 * A note counts as a "hit" when its verdict is not "miss".
 * An empty passage scores 0% over 0 notes (no division-by-zero).
 */
export function scorePassage(errorsMs: readonly number[], windows: TimingWindows = DEFAULT_WINDOWS): AccuracyScore {
  const total: number = errorsMs.length;
  let hits: number = 0;
  for (const errorMs of errorsMs) {
    if (classifyHit(errorMs, windows) !== "miss") {
      hits += 1;
    }
  }
  const misses: number = total - hits;
  const accuracyPct: number = total === 0 ? 0 : Math.round((hits / total) * 1000) / 10;
  return { total, hits, misses, accuracyPct };
}
