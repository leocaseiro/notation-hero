import type { UserProgress, UserProgressPort } from "./userProgressPort.ts";

/** Composite key matching a DynamoDB PK#SK layout, without the AWS SDK. */
function keyOf(userId: string, lessonId: string): string {
  return `USER#${userId}#LESSON#${lessonId}`;
}

/**
 * In-memory UserProgressPort - the Wave 1 stub. Behaves like the real
 * DynamoDB adapter will (idempotent put, last-write-wins) but holds state
 * in a Map. Swapping in @aws-sdk/client-dynamodb is a later lane.
 */
export class InMemoryUserProgress implements UserProgressPort {
  private readonly store: Map<string, UserProgress> = new Map();

  async get(userId: string, lessonId: string): Promise<UserProgress | undefined> {
    return this.store.get(keyOf(userId, lessonId));
  }

  async put(progress: UserProgress): Promise<void> {
    this.store.set(keyOf(progress.userId, progress.lessonId), progress);
  }
}
