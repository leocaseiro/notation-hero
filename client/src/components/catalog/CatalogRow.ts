// The row shape the catalog columns + NameCell consume. DataTable itself is generic and
// never sees this type. Mirrors the spec's "Example data shape".
export interface CatalogRow {
  id: string;
  title: string;
  subtitle: string; // pre-composed line 2, e.g. "Rock · 4/4 · drums·guitar" or "4 steps · timing"
  kind: 'song' | 'beat' | 'rudiment' | 'fill'; // full words only — no abbreviations
  icon?: string; // Material Symbol name for the cover
  isLesson?: boolean;
  level: number | null; // 0 = Debut, null = ungraded
  bpm: number | string; // 116, or "60→120" for a lesson ramp
  best: number | null; // 0–100, null = not attempted
  isNew?: boolean;
  flags?: { audio?: boolean; video?: boolean; parts?: boolean };
}
