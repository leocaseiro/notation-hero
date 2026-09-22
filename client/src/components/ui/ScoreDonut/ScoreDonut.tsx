import { cn } from '@/lib/utils';

interface ScoreDonutProps {
  score: number | null;
  size?: number;
}

// Locked bands (spec): 1–49 low, 50–69 developing, 70–88 climbing, 89–99 high.
function band(score: number): 'low' | 'developing' | 'climbing' | 'high' {
  if (score <= 49) return 'low';
  if (score <= 69) return 'developing';
  if (score <= 88) return 'climbing';
  return 'high';
}

export const ScoreDonut = ({ score, size = 28 }: Readonly<ScoreDonutProps>) => {
  // 100 = mastered: gold disc + trophy glyph (no ring, no number, no glow).
  if (score === 100) {
    return (
      <span
        data-slot="score-donut"
        data-band="mastered"
        role="img"
        aria-label="Best score: 100"
        className="inline-grid place-items-center rounded-full bg-score-mastered text-score-mastered-foreground"
        style={{ width: size, height: size }}
      >
        <span
          className="material-symbols-outlined"
          aria-hidden="true"
          style={{ fontSize: size * 0.56 }}
        >
          trophy
        </span>
      </span>
    );
  }

  // null OR 0 = not attempted: empty grey ring + dash.
  const value = score === 0 ? null : score;
  const label = value === null ? 'Not attempted' : `Best score: ${value}`;
  const background =
    value === null
      ? 'var(--muted)'
      : `conic-gradient(var(--score-${band(value)}) calc(${value} * 1%), var(--muted) 0)`;

  return (
    <span
      data-slot="score-donut"
      data-band={value === null ? 'none' : band(value)}
      role="img"
      aria-label={label}
      className="relative inline-grid place-items-center rounded-full"
      style={{ width: size, height: size, background }}
    >
      {/* crisp inner hole — matches the mockup's ::before (inset ~18% of the diameter) */}
      <span
        aria-hidden="true"
        className="absolute rounded-full bg-card"
        style={{ inset: Math.round(size * 0.18) }}
      />
      <span
        aria-hidden="true"
        className={cn(
          'relative font-mono font-bold tabular-nums',
          value === null ? 'text-muted-foreground' : 'text-foreground',
        )}
        style={{ fontSize: Math.round(size * 0.33) }}
      >
        {value === null ? '–' : value}
      </span>
    </span>
  );
};
