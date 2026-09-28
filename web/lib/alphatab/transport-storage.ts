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
/**
 * What each stored key is CALLED in the UI, for the warning that names a corrected control. The
 * dot-path is what to grep for; the label is what the drummer can go and look at. A report carrying
 * only one of them is hard to act on from the other end — the same reasoning as SETTING_LABELS.
 */
export const TRANSPORT_LABELS: Readonly<Record<string, string>> = {
  metronomeVolume: 'Metronome volume',
  countInVolume: 'Count-in volume',
  masterVolume: 'Master volume',
  isLooping: 'Loop',
};

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

/**
 * What a read of the stored document yields: the four values, plus the reader's own account of
 * whether it had to correct anything on the way.
 *
 * The signal is carried rather than dropped because a silently-corrected value is indistinguishable
 * from a broken player. A non-finite stored master volume comes back as 0 — the drummer presses
 * Play, hears nothing, and has no way to know which of the controls to go and move. The settings
 * document, read through this very same reader, names the corrected rows and rewrites itself clean;
 * this one now does the same.
 */
export interface StoredTransport {
  values: TransportValues;
  /** True when something stored was WRONG — unparseable, wrong-shaped, or out of its row's range. */
  reset: boolean;
  /** The keys that were corrected, for the warning that names them. */
  repaired: readonly string[];
}

export function loadStoredTransport(raw: string | null): StoredTransport {
  const { settings, reset, repaired } = loadStoredSettings(
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
    values: {
      metronomeVolume: settings.metronomeVolume as number,
      countInVolume: settings.countInVolume as number,
      masterVolume: settings.masterVolume as number,
      isLooping: settings.isLooping as boolean,
    },
    reset,
    repaired,
  };
}

/**
 * The stored values, or the shipped defaults when storage cannot be read at all.
 *
 * A browser with site data blocked throws from the localStorage GETTER itself, not only from
 * setItem. Catching it here rather than at the call site keeps that knowledge in one place and the
 * caller a single expression.
 */
export function readStoredTransport(): StoredTransport {
  try {
    return loadStoredTransport(globalThis.localStorage.getItem(TRANSPORT_STORAGE_KEY));
  } catch {
    // A fresh object rather than the shared DEFAULT_TRANSPORT_VALUES, so the two paths agree about
    // whether the caller may hold on to what it got. Storage being unreadable is not a repair:
    // nothing was corrected, so `reset` stays false and no warning fires.
    return { values: { ...DEFAULT_TRANSPORT_VALUES }, reset: false, repaired: [] };
  }
}

/**
 * The ONE place the four transport values reach storage. Each writer in `PlayerShell` calls it with
 * just the value it changed; the other three come from the document already IN storage, never from
 * that render's closure.
 *
 * Reading storage rather than closing over React state is what makes the write correct in a way a
 * closure cannot be. A second open /play tab holds its own state, so a whole-document write from
 * that state silently reverts whatever the other tab last set — the drummer turns the metronome on
 * in one tab, flips Loop in the other, and the metronome preference is gone, with nothing shown at
 * the time.
 *
 * It sits here rather than in the component for the reason `readStoredTransport` does: this module
 * owns both directions of the one document. A plain module function is also stable by construction,
 * which is what the `useCallback` it replaced was for — the four writers that call it stay stable
 * too, so a Loop press cannot re-render the memo()'d TracksPopover that only displays the master
 * volume.
 *
 * The extra getItem + JSON.parse costs one four-key document per user gesture: the sliders commit
 * once per drag (useSliderDraft), so this is never per-frame work.
 */
export function persistTransport(change: Partial<TransportValues>): void {
  try {
    globalThis.localStorage.setItem(
      TRANSPORT_STORAGE_KEY,
      serializeTransport({ ...readStoredTransport().values, ...change }),
    );
  } catch {
    // Private browsing and a full quota both throw here. Losing persistence is survivable; losing
    // the transport is not, so swallow it rather than breaking the toggle.
  }
}
