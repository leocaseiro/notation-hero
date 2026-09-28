import { loadStoredSettings, serializeSettings } from './settings-storage';

/**
 * The transport values that survive a reload, and their one localStorage key.
 *
 * These are `AlphaTabApi` PROPERTIES, not fields in AlphaTab's settings JSON: `PlayerSettings`
 * declares no field for any of them. Checked against 1.9.0 as well as the pinned 1.8.4, so it is
 * not a gap a version bump closes — alphaTab's own tutorial sets them the same way this app does,
 * by plain assignment, and persists nothing.
 *
 * They get their own KEY rather than a corner of the settings document because that document is
 * handed whole to `Settings.fillFromJson`, and because `loadStoredSettings` keeps only the keys its
 * defaults declare — a transport value stored in there would be dropped on the way back in unless
 * it were also added to `DEFAULT_PLAYER_SETTINGS`, where it does not belong.
 *
 * They reuse that module's READER, though. The parse, the shape check, the per-key merge against
 * the defaults and the range clamp are the same job with the same edge cases, and one copy of that
 * reasoning is worth more than a second tailored one.
 *
 * `playbackSpeed` is the fifth such api property and is deliberately absent. It is the one a
 * drummer changes per PASSAGE rather than per session — 60% for a hard bar is wrong for the next
 * song — so it resets to 100% on every load until the local-file player has a score identity to key
 * a per-score value on (NH-295).
 */
export const TRANSPORT_STORAGE_KEY = 'notation-hero.transport';

export interface TransportValues {
  /** 0 is off, 1 the normal level — AlphaTab models both toggles as volumes, not booleans. */
  metronomeVolume: number;
  countInVolume: number;
  masterVolume: number;
  isLooping: boolean;
}

/** What a first visit gets, and what a corrupt value falls back to. Matches the engine's own. */
export const DEFAULT_TRANSPORT_VALUES: TransportValues = {
  metronomeVolume: 0,
  countInVolume: 0,
  masterVolume: 1,
  isLooping: false,
};

/**
 * The three volumes are 0-1 ratios — the range the Settings popover's own rows declare, passed here
 * so a stored number outside it is clamped rather than trusted. `isLooping` needs no entry: the
 * reader's per-key merge already rejects anything that is not a boolean.
 */
const TRANSPORT_BOUNDS = {
  metronomeVolume: { min: 0, max: 1 },
  countInVolume: { min: 0, max: 1 },
  masterVolume: { min: 0, max: 1 },
} as const;

/**
 * Shares the settings document's envelope, `{ version, settings }`, because it shares its reader.
 * The version integer therefore tracks `SETTINGS_VERSION`. Neither document branches on it today,
 * so the coupling costs nothing; the first migration that needs them to move apart gives this file
 * its own envelope.
 */
export function serializeTransport(values: TransportValues): string {
  return serializeSettings({ ...values });
}

export function loadStoredTransport(raw: string | null): TransportValues {
  const { settings } = loadStoredSettings(
    raw,
    { ...DEFAULT_TRANSPORT_VALUES },
    // No option-bearing rows and no text rows here — the four values are three numbers and a
    // boolean, which the merge and the bounds below cover between them.
    {},
    TRANSPORT_BOUNDS,
    {},
  );
  // The reader guarantees each key is present and of its default's type, so these are the types
  // declared above rather than an unchecked hope: a stored value of the wrong type was replaced by
  // the default before it got here, and a missing one was backfilled from it.
  return {
    metronomeVolume: settings.metronomeVolume as number,
    countInVolume: settings.countInVolume as number,
    masterVolume: settings.masterVolume as number,
    isLooping: settings.isLooping as boolean,
  };
}

/**
 * The stored values, or the shipped defaults when storage cannot be read at all.
 *
 * A browser with site data blocked throws from the localStorage GETTER itself, not only from
 * setItem. Catching it here rather than at the call site keeps that knowledge in one place and the
 * caller a single expression.
 */
export function readStoredTransport(): TransportValues {
  try {
    return loadStoredTransport(globalThis.localStorage.getItem(TRANSPORT_STORAGE_KEY));
  } catch {
    return DEFAULT_TRANSPORT_VALUES;
  }
}
