import { cn } from '@/lib/utils';

interface LevelPillProps {
  level: number | null;
}

// Accessible name: never a bare dash — null reads "Ungraded", 0 reads "Debut",
// 1–10 read "Level: N". Extracted to a helper so the JSX stays free of nested
// ternaries (sonarjs/no-nested-conditional).
function levelLabel(level: number | null): string {
  if (level === null) {
    return 'Ungraded';
  }
  if (level === 0) {
    return 'Debut';
  }
  return `Level: ${level}`;
}

// Visible glyph: dash for ungraded, the word "Debut" for level 0, else the number.
// Returns a string (single return type — sonarjs/function-return-type) since the
// number is rendered as text anyway.
function levelDisplay(level: number | null): string {
  if (level === null) {
    return '–';
  }
  if (level === 0) {
    return 'Debut';
  }
  return String(level);
}

export const LevelPill = ({ level }: Readonly<LevelPillProps>) => {
  const isUngraded = level === null;
  const isDebut = level === 0;

  return (
    <span
      data-slot="level-pill"
      role="img"
      aria-label={levelLabel(level)}
      className={cn(
        'inline-flex min-w-7 items-center justify-center rounded-md border px-2 py-0.5 font-mono text-xs font-semibold tabular-nums',
        isUngraded ? 'border-dashed border-border text-muted-foreground' : 'border-border bg-muted',
        // Debut = brand-teal accent TEXT only (neutral pill). --level-debut is a teal
        // tuned for AA contrast on --muted in BOTH themes (--primary is a fill colour
        // and is unreadable as text on the dark muted surface — fails WCAG AA).
        isDebut && 'text-level-debut',
      )}
    >
      <span aria-hidden="true">{levelDisplay(level)}</span>
    </span>
  );
};
