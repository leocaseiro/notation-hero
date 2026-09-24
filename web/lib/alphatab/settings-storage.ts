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
): { settings: PlayerSettingsJson; dropped: boolean } {
  let settings = merged;
  let dropped = false;
  for (const [path, allowed] of Object.entries(optionValues)) {
    const value = readSettingValue(settings, path);
    if (value === undefined) continue;
    if (typeof value !== 'string' || !allowed.includes(value)) {
      settings = writeSettingValue(settings, path, readSettingValue(defaults, path) ?? '');
      dropped = true;
    }
  }
  return { settings, dropped };
}

/**
 * Read the stored settings, merging per key against the shipped defaults.
 *
 * `reset` is true only when something was actually WRONG — unparseable, the wrong shape, or a
 * value its row does not offer. A first visit (null) and an older version that merges cleanly are
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
): { settings: PlayerSettingsJson; reset: boolean } {
  if (raw === null) return { settings: defaults, reset: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { settings: defaults, reset: true };
  }

  if (!isPlainObject(parsed) || !isPlainObject(parsed.settings)) {
    return { settings: defaults, reset: true };
  }

  const merged = mergeAgainstDefaults(parsed.settings, defaults);
  // A value no row offers is a corruption, not an older shape: say so, so the warning fires.
  const { settings, dropped } = dropUnknownOptions(merged, defaults, optionValues);
  return { settings, reset: dropped };
}
