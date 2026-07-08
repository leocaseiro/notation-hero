import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Dark-mode contrast helpers. These read the real design tokens straight out of `styles.css` so the
// checks track the source of truth — no hardcoded colour copies to drift. Consumed by
// `dark-contrast.test.ts` (NH-254 catalog token pairs) and `Button.test.tsx` (NH-262 `link` variant
// text + hover). This catches the class of bug a Storybook axe pass can miss: a token used on a
// surface no story renders it on (e.g. the Button `link` variant on a `--muted` bar).

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

// Approximates CSS `color-mix(in oklch, <token>, black <pct*100>%)` — mixing towards black scales L
// and C down by the black share (black contributes 0 to both) and leaves hue untouched. Used to
// regression-test computed hover colors (e.g. the Button `link` variant's darkened hover) without
// hardcoding the mixed value.
export function mixWithBlack([l, c, h]: Oklch, pct: number): Oklch {
  return [l * (1 - pct), c * (1 - pct), h];
}

// Read the DARK oklch value of each token from styles.css — scoped to the `.dark { … }` rule so a
// token declared only under `:root` (light) can never leak in as its "dark" value. (A whole-file
// scan lets the last declaration for a name win regardless of the block it came from, so a
// reordered or light-only token could silently validate the wrong colour and still pass.) Alpha
// tokens (a `/` in the value, e.g. `--border`) are skipped; the checks only use solid tokens.
export function readDarkTokens(): Record<string, Oklch> {
  // vitest runs per-package (cwd = client/), but also resolve from the repo root so a root-level
  // `vitest` invocation doesn't ENOENT. (import.meta.url isn't file:// under jsdom and a `?raw`
  // import returns empty for this Tailwind entrypoint, so the cwd anchor is the reliable one.)
  const rel = existsSync('src/styles.css') ? 'src/styles.css' : 'client/src/styles.css';
  const css = readFileSync(path.resolve(process.cwd(), rel), 'utf8');
  const darkBlock = extractBlock(css, /\.dark\s*\{/);
  const tokens: Record<string, Oklch> = {};
  // Bounded quantifiers (kebab name, then a non-`)` run) — one match each, no nested backtracking.
  const re = /--([\w-]{1,64}):\s*oklch\(([^)]{1,64})\)/g;
  for (const [, name, value] of darkBlock.matchAll(re)) {
    const [ls, cs, hs] = value?.trim().split(/\s+/) ?? [];
    if (name && value && ls && cs && hs && !value.includes('/')) {
      tokens[name] = [Number.parseFloat(ls) / 100, Number.parseFloat(cs), Number.parseFloat(hs)];
    }
  }
  return tokens;
}

// Contents of the first `{ … }` block whose selector matches `opener`, balancing nested braces so a
// nested at-rule/selector inside the block can't truncate it early. Empty string if not found.
function extractBlock(css: string, opener: RegExp): string {
  const match = opener.exec(css);
  if (!match) return '';
  const start = match.index + match[0].length;
  let depth = 1;
  let i = start;
  for (; i < css.length && depth > 0; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') depth -= 1;
  }
  return css.slice(start, i - 1);
}
