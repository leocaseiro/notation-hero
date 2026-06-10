import { scorePassage, type AccuracyScore } from "@notation-hero/scoring";

/** A finished practice take as captured by the (future) player UI. */
export interface PracticeTake {
  readonly lessonId: string;
  readonly timingErrorsMs: readonly number[];
}

/** App-layer summary the UI will render after a take. */
export interface TakeSummary {
  readonly lessonId: string;
  readonly score: AccuracyScore;
  readonly passed: boolean;
}

/** Pass threshold for a practice take (app-level policy, not domain). */
export const PASS_THRESHOLD_PCT: number = 70;

/** Summarize a take by delegating scoring to the core domain. */
export function summarizeTake(take: PracticeTake): TakeSummary {
  const score: AccuracyScore = scorePassage(take.timingErrorsMs);
  return {
    lessonId: take.lessonId,
    score,
    passed: score.accuracyPct >= PASS_THRESHOLD_PCT,
  };
}
