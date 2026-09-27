import { readSettingValue, writeSettingValue } from './settings-paths';
import type { PlayerSettingsJson } from './settings-paths';

export const SETTINGS_STORAGE_KEY = 'notation-hero.player-settings';
// Stored beside the settings so a future shape change can migrate rather than discard. v0 writes
// it and does not branch on it: the per-key merge against the shipped defaults already handles the
// only change a later release makes (new keys appearing). The first migration that needs it reads
// it here.
export const SETTINGS_VERSION = 1;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Deep merge per key, keeping only keys the defaults declare — and only a stored value of the
 * SAME TYPE as its default. The stored JSON goes to the engine through fillFromJson, which takes
 * what it is given: a string where a number belongs breaks the layout without throwing.
 */
function mergeAgainstDefaults(
  stored: Record<string, unknown>,
  defaults: PlayerSettingsJson,
): PlayerSettingsJson {
  const merged: PlayerSettingsJson = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = stored[key];
    if (isPlainObject(fallback)) {
      merged[key] = mergeAgainstDefaults(isPlainObject(value) ? value : {}, fallback);
    } else if (Array.isArray(fallback)) {
      // `typeof` calls an array, an object and null all 'object', so an array gets its own check:
      // the same length, and every element the same type as the default's.
      const sameShape =
        Array.isArray(value) &&
        value.length === fallback.length &&
        value.every((item, index) => typeof item === typeof fallback[index]);
      merged[key] = sameShape ? value : fallback;
    } else {
      merged[key] = typeof value === typeof fallback ? value : fallback;
    }
  }
  return merged;
}

export function serializeSettings(settings: PlayerSettingsJson): string {
  return JSON.stringify({ version: SETTINGS_VERSION, settings });
}

/**
 * Drop any stored value its row does not offer, back to the shipped default. Runs ONCE on the
 * whole stored document, before the restore push — not per edit, which sees a single key and
 * cannot tell a poisoned session from a fresh one.
 *
 * A stored enum NAME the engine does not know is not inert: fillFromJson assigns the parser's
 * `undefined` straight through and reports success, so the good value is gone and stays gone for
 * the session. The same-type check in the merge above cannot see it — a name the engine knows and
 * one it does not are both strings — so the whole document is gated on the option lists before it
 * is ever pushed.
 *
 * A path this map names but the stored (and now-merged) document does not have is NOT a drop: an
 * older stored shape simply has not grown that row yet, and the merge above already backfilled it
 * from the defaults.
 */
function dropUnknownOptions(
  merged: PlayerSettingsJson,
  defaults: PlayerSettingsJson,
  optionValues: Readonly<Record<string, readonly string[]>>,
): { settings: PlayerSettingsJson; repaired: string[] } {
  let settings = merged;
  const repaired: string[] = [];
  for (const [path, allowed] of Object.entries(optionValues)) {
    const value = readSettingValue(settings, path);
    if (value === undefined) continue;
    if (typeof value !== 'string' || !allowed.includes(value)) {
      settings = writeSettingValue(settings, path, readSettingValue(defaults, path) ?? '');
      repaired.push(path);
    }
  }
  return { settings, repaired };
}

/**
 * The same repair as dropUnknownOptions, for the row kind neither it nor clampToBounds can see.
 *
 * A stored font or colour is a string, so the per-key merge's `typeof` check passes it, the option
 * lists do not cover it and the bounds do not either. It then reaches fillFromJson, where a bad
 * font THROWS — losing the entire restore, including every unrelated group — and a bad colour does
 * something worse than throwing: Color.fromJson returns null without raising, and the renderer
 * dereferences it a frame later, outside any try/catch.
 *
 * Restoring the default for just that key keeps the other twelve rows and every other group, and
 * folds into the same `reset` flag so the drummer is told rather than silently reverted.
 */
function dropInvalidText(
  merged: PlayerSettingsJson,
  defaults: PlayerSettingsJson,
  textValidators: Readonly<Record<string, (draft: string) => boolean>>,
): { settings: PlayerSettingsJson; repaired: string[] } {
  let settings = merged;
  const repaired: string[] = [];
  for (const [path, isValid] of Object.entries(textValidators)) {
    const value = readSettingValue(settings, path);
    if (value === undefined) continue;
    // Judge and store the SAME string. Both validators normalise before testing — isCssColor trims,
    // isFontShorthand trims and splits on /\s+/ — and neither engine parser does either, so the raw
    // value can pass here and still fail there. Measured against the pinned engine:
    // Color.fromJson(' #A5A5A5') is null (and the renderer then reads .rgba off it), and
    // Font.fromJson('12px\tArial') THROWS, which discards the WHOLE restore with no warning.
    // Collapsing runs as well as trimming is what the font case needs, since its break is internal;
    // it is harmless to colours, whose rgba() the engine already reads with spaces inside.
    // This is the rule the write path adopted for the same reason: commit exactly what was checked.
    const judged = typeof value === 'string' ? value.trim().replaceAll(/\s+/g, ' ') : value;
    if (typeof judged !== 'string' || !isValid(judged)) {
      settings = writeSettingValue(settings, path, readSettingValue(defaults, path) ?? '');
      repaired.push(path);
    } else if (judged !== value) {
      settings = writeSettingValue(settings, path, judged);
      repaired.push(path);
    }
  }
  return { settings, repaired };
}

/**
 * Pull any stored number back inside its row's declared range. Runs in the same pass as
 * dropUnknownOptions, for the same reason: it sees the whole document before the restore push.
 *
 * Nothing else catches this. The merge above gates on `typeof`, so -5 and 1e9 both pass against a
 * numeric default, and the option lists gate enum NAMES. The field's own clamp runs only on commit
 * (blur or Enter) — closing the tab mid-edit persists the unclamped draft, and every later visit
 * restores it and pushes it into the engine. Clamping rather than resetting to the default keeps
 * the intent of what was typed: a 5 typed into a row that stops at 3 becomes 3, not the shipped
 * default.
 */
function clampToBounds(
  merged: PlayerSettingsJson,
  bounds: Readonly<Record<string, { readonly min?: number; readonly max?: number }>>,
): { settings: PlayerSettingsJson; repaired: string[] } {
  let settings = merged;
  const repaired: string[] = [];
  for (const [path, { min, max }] of Object.entries(bounds)) {
    const value = readSettingValue(settings, path);
    // A path the stored document does not carry is not a violation — the merge already backfilled
    // it from the defaults. A non-number never got past the merge's type check either.
    if (typeof value !== 'number') continue;
    // NaN and the infinities survive JSON.parse as numbers via a crafted document — `1e999`
    // parses to Infinity — and they compare false against every bound, so they would otherwise
    // pass straight through. They are pinned to the row's MINIMUM (its maximum when it declares
    // no minimum, 0 when it declares neither).
    //
    // That ignores the sign on purpose: +Infinity lands on the minimum too, not the maximum it is
    // nearer to. A non-finite stored number is corruption, not a value with a meaningful
    // direction, and the low end is the safer landing for every row here — a score restored too
    // small is obvious and one keystroke from fixed, where one restored at the maximum looks like
    // the app broke.
    const bounded = Number.isFinite(value)
      ? Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, value))
      : (min ?? max ?? 0);
    if (bounded !== value) {
      settings = writeSettingValue(settings, path, bounded);
      repaired.push(path);
    }
  }
  return { settings, repaired };
}

/**
 * Read the stored settings, merging per key against the shipped defaults.
 *
 * `reset` is true only when something was actually WRONG — unparseable, the wrong shape, a value
 * its row does not offer, or a number outside its row's declared range. A first visit (null) and an older version that merges cleanly are
 * both normal, and raising a "settings were reset" warning for either would cry wolf.
 *
 * Merging per key rather than discarding the whole object matters because the stored shape can
 * change after it ships — a drummer who upgrades should keep the colours they chose, not start
 * over.
 */
export function loadStoredSettings(
  raw: string | null,
  defaults: PlayerSettingsJson,
  // Every option-bearing row's allowed VALUES, by dot-path. The same-type check in the merge above
  // cannot see a bad enum name: the good one and the typo are both strings.
  optionValues: Readonly<Record<string, readonly string[]>>,
  // Every number/range row's declared min/max, by dot-path. The same-type check in the merge above
  // cannot see an out-of-range number: -5 and 0 are both numbers.
  numericBounds: Readonly<Record<string, { readonly min?: number; readonly max?: number }>>,
  // Every text row's own validator, by dot-path. The same-type check in the merge above cannot see
  // a font the engine will throw on, or a colour it will silently turn into null: `bold`, `red` and
  // a good value are all strings.
  textValidators: Readonly<Record<string, (draft: string) => boolean>>,
): { settings: PlayerSettingsJson; reset: boolean; repaired: string[] } {
  if (raw === null) return { settings: defaults, reset: false, repaired: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { settings: defaults, reset: true, repaired: [] };
  }

  if (!isPlainObject(parsed) || !isPlainObject(parsed.settings)) {
    return { settings: defaults, reset: true, repaired: [] };
  }

  const merged = mergeAgainstDefaults(parsed.settings, defaults);
  // A value no row offers is a corruption, not an older shape: say so, so the warning fires.
  const { settings: gated, repaired: badOptions } = dropUnknownOptions(
    merged,
    defaults,
    optionValues,
  );
  // A font or colour the engine will reject is the same corruption again — and the only one that
  // can take the WHOLE restore with it, so it is repaired here rather than left to fillFromJson.
  const { settings: texted, repaired: badText } = dropInvalidText(gated, defaults, textValidators);
  // Out of its row's range is the same kind of corruption, and reuses the same warning.
  const { settings, repaired: outOfRange } = clampToBounds(texted, numericBounds);
  // The PATHS, not just a flag: the warning names what it corrected, and the console log pairs
  // each path with its row label so a report can be searched by either.
  const repaired = [...badOptions, ...badText, ...outOfRange];
  return { settings, reset: repaired.length > 0, repaired };
}
