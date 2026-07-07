import { readFileSync } from 'node:fs';
import path from 'node:path';

// Dark-mode contrast helpers. These read the real design tokens straight out of `styles.css` so the
// checks track the source of truth — no hardcoded colour copies to drift. Consumed by
// `dark-contrast.test.ts`, which guards that the token pairs the NH-254 catalog components render
// meet WCAG AA in dark mode. This catches the class of bug a Storybook axe pass can miss: a token
// used on a surface no story renders it on (e.g. the Button `link` variant on a `--muted` bar).

type Oklch = readonly [l: number, c: number, h: number];

// oklch (L in 0..1, C, H°) -> WCAG relative luminance, via OKLCH -> OKLab -> linear RGB.
export function oklchLuminance([L, C, H]: Oklch): number {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const lp = (L + 0.396_337_777_4 * a + 0.215_803_757_3 * b) ** 3;
  const mp = (L - 0.105_561_345_8 * a - 0.063_854_172_8 * b) ** 3;
  const sp = (L - 0.089_484_177_5 * a - 1.291_485_548 * b) ** 3;
  const clamp = (x: number): number => Math.min(Math.max(x, 0), 1);
  const r = clamp(4.076_741_662_1 * lp - 3.307_711_591_3 * mp + 0.230_969_929_2 * sp);
  const g = clamp(-1.268_438_004_6 * lp + 2.609_757_401_1 * mp - 0.341_319_396_5 * sp);
  const bl = clamp(-0.004_196_086_3 * lp - 0.703_418_614_7 * mp + 1.707_614_701 * sp);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

// WCAG contrast ratio between two relative luminances (order-independent).
export function contrastRatio(y1: number, y2: number): number {
  const hi = Math.max(y1, y2);
  const lo = Math.min(y1, y2);
  return (hi + 0.05) / (lo + 0.05);
}

// Read the DARK oklch value of each token from styles.css. The file declares every token under
// `:root` (light) first, then re-declares it under `.dark` (dark) later — so the last value parsed
// for a name is the dark-mode one. Alpha tokens (a `/` in the value, e.g. `--border`) are skipped;
// the checks only reference solid text/surface tokens. The `L% C H` triple is split on whitespace.
export function readDarkTokens(): Record<string, Oklch> {
  // Resolved from the client package root — vitest runs per-package, so cwd is client/.
  const css = readFileSync(path.resolve(process.cwd(), 'src/styles.css'), 'utf8');
  const tokens: Record<string, Oklch> = {};
  // Bounded quantifiers (kebab name, then a non-`)` run) — one match each, no nested backtracking.
  const re = /--([\w-]{1,64}):\s*oklch\(([^)]{1,64})\)/g;
  for (const [, name, value] of css.matchAll(re)) {
    const [ls, cs, hs] = value?.trim().split(/\s+/) ?? [];
    if (name && value && ls && cs && hs && !value.includes('/')) {
      tokens[name] = [Number.parseFloat(ls) / 100, Number.parseFloat(cs), Number.parseFloat(hs)];
    }
  }
  return tokens;
}
