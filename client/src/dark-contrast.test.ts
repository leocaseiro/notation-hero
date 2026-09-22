import { describe, expect, it } from 'vitest';
import { contrastRatio, oklchLuminance, readDarkTokens } from './dark-contrast';

// Guards WCAG AA contrast in DARK mode for the token pairs the NH-254 catalog components actually
// render — the a11y sweep already checks each story on the surface it paints, but this pins the
// underlying tokens so a future token edit (or a reintroduced dim link colour) fails fast in unit
// tests, on every surface the components use, not just the one a story happens to render.

const tokens = readDarkTokens();
const luminance = (name: string): number => {
  const token = tokens[name];
  if (!token) throw new Error(`--${name} not found in the .dark block of styles.css`);
  return oklchLuminance(token);
};

// [text token, surface token, min ratio, where the catalog components render it].
// Body/label text -> 4.5:1 (AA normal text); large/decorative glyphs -> 3:1 (AA non-text).
const PAIRS: ReadonlyArray<readonly [string, string, number, string]> = [
  [
    'muted-foreground',
    'background',
    4.5,
    'placeholders, secondary text, chevrons (triggers, readout, search)',
  ],
  [
    'muted-foreground',
    'popover',
    4.5,
    'popover labels + list status rows (LevelFilter, FacetFilter, TokenPicker)',
  ],
  ['foreground', 'muted', 4.5, 'highlighted combobox item label + inactive Tab text'],
  ['primary', 'popover', 3, 'teal check glyph in the open list (decorative)'],
  ['primary', 'muted', 3, 'teal check glyph on a highlighted (bg-muted) item'],
  ['primary-foreground', 'primary', 4.5, 'selected chips, active Tab, active page'],
];

describe('dark-mode contrast — NH-254 catalog component token pairs', () => {
  it.each(PAIRS)('%s on %s stays >= %s:1 (AA) — %s', (text, surface, min) => {
    expect(contrastRatio(luminance(text), luminance(surface))).toBeGreaterThanOrEqual(min);
  });
});
