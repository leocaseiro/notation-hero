/**
 * Per-user progress persistence PORT. DynamoDB is the canonical per-user
 * (NOT catalogue) data home; the catalogue lives in Neon Postgres + JSONB
 * (out of Wave 1 scope). This adapter is the hexagonal TEMPLATE for per-user
 * persistence. Wave 1 ships a typed port + in-memory stub; real @aws-sdk
 * wiring lands in a later lane.
 */

/** One user's practice progress for a single lesson. */
export interface UserProgress {
  readonly userId: string;
  readonly lessonId: string;
  /** 0..100 best accuracy recorded for this lesson. */
  readonly bestAccuracyPct: number;
  /** ISO-8601 timestamp of the last attempt. */
  readonly updatedAt: string;
}

/** The port the domain depends on; adapters implement it. */
export interface UserProgressPort {
  get(userId: string, lessonId: string): Promise<UserProgress | undefined>;
  put(progress: UserProgress): Promise<void>;
}
