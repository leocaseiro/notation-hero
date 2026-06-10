import { summarizeTake, type PracticeTake } from "./practiceSession.ts";

/**
 * Wave 1 entry point. Not a real PWA - just a buildable/typecheckable seam.
 * The Vite/PWA shell, DOM mount, and audio engine are a later lane.
 */
export function bootstrap(takes: readonly PracticeTake[]): string {
  const lines: string[] = takes.map((take) => {
    const summary = summarizeTake(take);
    const verdict: string = summary.passed ? "PASS" : "RETRY";
    return `${summary.lessonId}: ${summary.score.accuracyPct}% [${verdict}]`;
  });
  return lines.join("\n");
}
