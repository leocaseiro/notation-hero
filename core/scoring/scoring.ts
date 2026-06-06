/**
 * Map a 0–100 accuracy percentage to a 0–5 star rating.
 * (scope.md §Score rating — 5-star rating from a 0–100 percentage.)
 *
 * Pure domain logic: no AWS, no React, no HTTP. The real-time MIDI→verdict
 * hot path must call this directly — never through an adapter/port indirection.
 *
 * Out-of-range input is clamped so callers never have to pre-validate.
 */
export function starRating(percent: number): number {
  const clamped = Math.max(0, Math.min(100, percent));
  return Math.round((clamped / 100) * 5);
}
