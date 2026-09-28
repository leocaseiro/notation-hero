// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- Vitest files are never bundled by Next, so the double-bundle reason for this fence does not apply
import * as engine from '@coderline/alphatab';
import { expect, it } from 'vitest';

import { readSettingValue } from './settings-paths';
import {
  buildSettingGroups,
  DEFAULT_PLAYER_SETTINGS,
  SETTING_LABELS,
  SETTING_NUMERIC_BOUNDS,
  SETTING_OPTION_VALUES,
  SETTING_TEXT_VALIDATORS,
} from './settings-schema';
import type { PlayerSettingsJson } from './settings-paths';
import type { SettingValue } from '@notation-hero/client';

// The engine is the source of truth for every default, but the serializer does not hand back the
// shape `readSettingValue` walks. THREE conversions stand between them:
//  1. settingsToJsObject returns nested Maps (SettingsSerializer.toJson), and `part in current` —
//     how readSettingValue steps a path — never sees a Map entry, so every path would miss on its
//     first segment. Convert the Map tree to plain objects first.
//  2. Every key comes back LOWERCASED ('scrolloffsety', 'playermode'), so lowercase each segment.
//  3. Enums come back as NUMBERS; the shipped table stores their NAMES. Resolve the name.
// Colours come back as PACKED SIGNED INTEGERS (-16777216), not '#000000', so a colour row is read
// through `.rgba` on the live Settings instead. The converter is on `model`; the `json` namespace
// is empty at runtime. Fonts come back as an object (families/size/style/weight), which
// `readSettingValue` cannot see either — a font row is compared on those fields directly, and
// `elementFonts` is a Map keyed by NUMBER, so a lowercased dot-path can never reach it at all.
const plain = (value: unknown): unknown =>
  value instanceof Map ? Object.fromEntries([...value].map(([k, v]) => [k, plain(v)])) : value;

// Walks DEFAULT_PLAYER_SETTINGS to every primitive leaf, yielding its dot path and value. Recurses
// into arrays too, using the index as the path segment — that is what makes `display.padding.0`
// and `display.padding.1` show up as their own leaves instead of the array being treated as one.
function* eachLeaf(value: unknown, prefix = ''): Generator<[path: string, value: SettingValue]> {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      yield* eachLeaf(item, prefix ? `${prefix}.${index}` : String(index));
    }
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      yield* eachLeaf(item, prefix ? `${prefix}.${key}` : key);
    }
    return;
  }
  yield [prefix, value as SettingValue];
}

// Set by the player at construction or by this app's own choice, so they are NOT what a fresh
// Settings() reports and never can be. Every OTHER key stays under the guard — including
// player.enableCursor (engine default true) and player.scrollMode (engine default Continuous),
// which DO match and would be silently un-checked if this list were widened to all four.
const NOT_ALPHATAB_DEFAULTS = new Set([
  'core.engine', // engine default 'default'; this app ships the SVG renderer
  'player.playerMode', // engine default Disabled; PlayerShell sets EnabledAutomatic
  'player.scrollOffsetY', // engine default 0; PlayerShell sets -10
]);

// The six colour rows: compared against `fresh.display.resources[key].rgba`, the CSS string the
// live Color reports — NOT the serializer's packed signed integer.
const COLOR_PATHS = new Set([
  'display.resources.staffLineColor',
  'display.resources.barSeparatorColor',
  'display.resources.barNumberColor',
  'display.resources.mainGlyphColor',
  'display.resources.secondaryGlyphColor',
  'display.resources.scoreInfoColor',
]);

// The three plain font rows: a direct property of RenderingResources, not the elementFonts map.
const PLAIN_FONT_PATHS = new Set([
  'display.resources.numberedNotationFont',
  'display.resources.tablatureFont',
  'display.resources.graceFont',
]);

const ELEMENT_FONT_PREFIX = 'display.resources.elementFonts.';

// Every select-kind settings row backed by a real AlphaTab enum, mapped to an accessor for that
// enum's runtime object — resolved against the passed-in engine namespace, never hand-copied.
// core.engine (a plain string, not an enum) and player.playerMode are absent on purpose: both are
// in NOT_ALPHATAB_DEFAULTS already, so their shipped value is never looked up here.
const ENUM_BY_PATH: Record<string, (e: typeof engine) => Record<string, string | number>> = {
  'display.layoutMode': (e) => e.LayoutMode,
  'display.systemsLayoutMode': (e) => e.SystemsLayoutMode,
  'notation.fingeringMode': (e) => e.FingeringMode,
  'notation.rhythmMode': (e) => e.TabRhythmMode,
  'player.scrollMode': (e) => e.ScrollMode,
};

type ParsedFont = { families: string[]; size: number; style: number; weight: number };

/** The four comparable fields of a parsed CSS font string, in the shape both sides can produce. */
const fontShape = (font: ParsedFont) => [font.families, font.size, font.style, font.weight];

/** A colour row: shipped hex/rgba string against `Color#rgba`'s own CSS string. */
function expectColorDefault(resources: unknown, path: string, shipped: SettingValue): void {
  const key = path.slice('display.resources.'.length);
  const live = (resources as Record<string, { rgba: string }>)[key];
  expect(shipped, path).toBe(live.rgba);
}

/** One of the nine `elementFonts` rows — the map is keyed by NUMBER, so `.get` needs the enum. */
function expectElementFontDefault(
  resources: { elementFonts: Map<number, ParsedFont> },
  path: string,
  shipped: SettingValue,
): void {
  const name = path.slice(ELEMENT_FONT_PREFIX.length) as keyof typeof engine.NotationElement;
  const live = resources.elementFonts.get(engine.NotationElement[name]);
  const parsedShipped = engine.model.Font.fromJson(shipped);
  expect(live, path).toBeDefined();
  expect(parsedShipped, path).toBeDefined();
  if (live && parsedShipped) expect(fontShape(parsedShipped), path).toEqual(fontShape(live));
}

/** One of the three plain font properties (numberedNotationFont, tablatureFont, graceFont). */
function expectPlainFontDefault(resources: unknown, path: string, shipped: SettingValue): void {
  const key = path.slice('display.resources.'.length);
  const live = (resources as Record<string, ParsedFont>)[key];
  const parsedShipped = engine.model.Font.fromJson(shipped);
  expect(parsedShipped, path).toBeDefined();
  if (parsedShipped) expect(fontShape(parsedShipped), path).toEqual(fontShape(live));
}

/** Everything else: read off the lowercased, Map-flattened serializer output. */
function expectSerializedDefault(
  serialised: PlayerSettingsJson,
  path: string,
  shipped: SettingValue,
): void {
  const actual = readSettingValue(serialised, path.toLowerCase());
  // An enum row ships its NAME; the serializer reports the number.
  const expected = ENUM_BY_PATH[path]?.(engine)[shipped as string] ?? shipped;
  expect(actual, path).toEqual(expected);
}

it('every shipped default is what a fresh Settings() reports', () => {
  const fresh = new engine.Settings();
  const serialised = plain(
    engine.model.JsonConverter.settingsToJsObject(fresh),
  ) as PlayerSettingsJson;
  const resources = fresh.display.resources;

  for (const [path, shipped] of eachLeaf(DEFAULT_PLAYER_SETTINGS)) {
    if (NOT_ALPHATAB_DEFAULTS.has(path)) continue;

    if (COLOR_PATHS.has(path)) {
      expectColorDefault(resources, path, shipped);
    } else if (path.startsWith(ELEMENT_FONT_PREFIX)) {
      expectElementFontDefault(resources, path, shipped);
    } else if (PLAIN_FONT_PATHS.has(path)) {
      expectPlainFontDefault(resources, path, shipped);
    } else {
      expectSerializedDefault(serialised, path, shipped);
    }
  }
});

it('SETTING_OPTION_VALUES still matches every settings-row option list', () => {
  // The stored document is gated on SETTING_OPTION_VALUES by the settings-storage restore path: if
  // it drifts from the real option lists, dropUnknownOptions wipes valid stored enum values and
  // fires a false "settings were reset" toast. The constant is hand-maintained (PlayerShell reads
  // it before the engine exists), so this is the case the SETTING_OPTION_VALUES comment promises —
  // never actually written until now — that keeps it honest.
  for (const group of buildSettingGroups(engine)) {
    for (const row of group.settings) {
      if (row.source !== 'settings' || row.control.kind !== 'select') continue;
      expect(SETTING_OPTION_VALUES[row.path], row.path).toEqual(
        row.control.options.map((option) => option.value),
      );
    }
  }
});

// The bounds a control declares, in the exact shape SETTING_NUMERIC_BOUNDS stores — `undefined`
// for a row that declares neither, so an unbounded row is asserted absent rather than empty.
function declaredBounds(control: {
  min?: number;
  max?: number;
}): { min?: number; max?: number } | undefined {
  const { min, max } = control;
  if (min === undefined && max === undefined) return undefined;
  const bounds: { min?: number; max?: number } = {};
  if (min !== undefined) bounds.min = min;
  if (max !== undefined) bounds.max = max;
  return bounds;
}

it('SETTING_NUMERIC_BOUNDS still matches every settings-row min/max', () => {
  // Same hazard as the option lists above, one file over: the restore path clamps stored numbers
  // against this hand-maintained mirror (PlayerShell reads it before the engine exists). A row
  // whose range is widened here but not there would keep clamping to the old limit and fire a
  // false "settings were reset" toast; one narrowed here but not there would let the bad value
  // through. Asserted in BOTH directions so a bound cannot be added, changed or forgotten.
  for (const group of buildSettingGroups(engine)) {
    for (const row of group.settings) {
      if (row.source !== 'settings') continue;
      if (row.control.kind !== 'number' && row.control.kind !== 'range') continue;
      // An unbounded row is absent from the map, never present and empty.
      expect(SETTING_NUMERIC_BOUNDS[row.path], row.path).toEqual(declaredBounds(row.control));
    }
  }
});

const byName = (a: string, b: string): number => a.localeCompare(b);

it("SETTING_TEXT_VALIDATORS still covers every settings text row, with the row's own validator", () => {
  // The third hand-maintained mirror, and the one whose absence is worst: a text row missing here
  // is gated by NOTHING on the way back in — the merge compares `typeof`, the option lists gate
  // enum names and the bounds gate numbers, so a bad font reaches fillFromJson and throws away the
  // whole restore. Asserted as the SAME function object the row uses, not merely as present, so a
  // re-implemented copy that drifts from the field's own rule fails here.
  for (const group of buildSettingGroups(engine)) {
    for (const row of group.settings) {
      if (row.source !== 'settings') continue;
      if (row.control.kind === 'text') {
        expect(SETTING_TEXT_VALIDATORS[row.path], row.path).toBe(row.control.validate);
        continue;
      }
      // A colour row has no validate of its own to compare against — it draws with
      // <input type="color">, which can only emit #rrggbb. Assert it is gated by the SAME function
      // the one text-shaped colour row uses (secondaryGlyphColor is text-shaped because it carries
      // alpha, which that input cannot express), so the check needs no new export to name.
      if (row.control.kind === 'color') {
        expect(SETTING_TEXT_VALIDATORS[row.path], row.path).toBe(
          SETTING_TEXT_VALIDATORS['display.resources.secondaryGlyphColor'],
        );
      }
    }
  }
});

it('SETTING_TEXT_VALIDATORS names no path that is not a text or colour row', () => {
  // The other direction: a stale entry would silently gate a row against a rule it no longer has.
  // A for/of rather than filter+map: `filter` does not narrow the discriminated union, so `row.path`
  // would not type-check against the api-sourced arm that has no path.
  const gatedPaths = new Set<string>();
  for (const group of buildSettingGroups(engine)) {
    for (const row of group.settings) {
      if (row.source !== 'settings') continue;
      if (row.control.kind !== 'text' && row.control.kind !== 'color') continue;
      gatedPaths.add(row.path);
    }
  }
  // Both directions, so adding a SEVENTH colour row without gating it fails here rather than
  // reaching Color.fromJson as a silent null.
  expect(Object.keys(SETTING_TEXT_VALIDATORS).toSorted(byName)).toEqual(
    [...gatedPaths].toSorted(byName),
  );
});

it('SETTING_LABELS still matches every settings row, and names no path that is not one', () => {
  // The fourth mirror, and the one a PERSON reads: the restore warning names the rows it
  // repaired, so a label that drifts from its row sends someone looking at the wrong setting.
  // Asserted in both directions, like the numeric bounds.
  const rowLabels = new Map<string, string>();
  for (const group of buildSettingGroups(engine)) {
    for (const row of group.settings) {
      if (row.source !== 'settings') continue;
      rowLabels.set(row.path, row.label);
      expect(SETTING_LABELS[row.path], row.path).toBe(row.label);
    }
  }
  expect(Object.keys(SETTING_LABELS).toSorted(byName)).toEqual(
    [...rowLabels.keys()].toSorted(byName),
  );
});

// The characters a font row refuses, and why each one has to be refused rather than escaped: the
// value is written straight into an SVG style attribute the renderer assigns as MARKUP —
// `<text … style='stroke: none; font:<value>; dominant-baseline: …'>` — so the apostrophe closes the
// attribute, the angle brackets open a tag, and the semicolon starts a second declaration on that
// text element. `12px a;fill:none` paints the text with nothing, on every visit, because the value
// is stored. A double quote stays ALLOWED: it is safe inside a single-quoted attribute, and
// `12px "Times New Roman"` is a font a person may legitimately want.
it('a font row refuses the characters that escape its own style attribute', () => {
  const validate = SETTING_TEXT_VALIDATORS['display.resources.tablatureFont'];

  expect(validate('12px Arial'), 'a plain font shorthand').toBe(true);
  expect(validate('bold 12px "Times New Roman"'), 'a quoted family name').toBe(true);

  expect(validate('12px a;fill:none'), 'a second declaration').toBe(false);
  expect(validate('12px a;'), 'a bare semicolon').toBe(false);
  expect(validate("12px 'a"), 'an apostrophe, which closes the attribute').toBe(false);
  expect(validate('12px <a'), 'an angle bracket, which opens a tag').toBe(false);
});
