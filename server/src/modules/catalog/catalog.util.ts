// N-14 band map (display-only): level 0 = Debut, 1-3 Beginner, 4-6 Intermediate, 7-8 Advanced,
// 9-10 Expert; null = Ungraded. A lookup over playable.level — no join. Lives in the catalog util
// (not the controller) so the service/repository layer in NH-123 imports it from a clean boundary
// (NH-79 review F15).
export function toDifficulty(level: number | null): string {
  if (level === null) return 'Ungraded';
  if (level === 0) return 'Debut';
  const n = String(level);
  if (level <= 3) return `Beginner ${n}`;
  if (level <= 6) return `Intermediate ${n}`;
  if (level <= 8) return `Advanced ${n}`;
  return `Expert ${n}`;
}
