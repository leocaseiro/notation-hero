import type { PlayerSettingsJson } from './settings-paths';
import type { SettingApply, StylesheetKey } from './settings-schema';
import type * as AlphaTab from '@coderline/alphatab';
import type { SettingValue, StaffToggleKey } from '@notation-hero/client';

/**
 * The ONE place the live engine's settings change: write, push to the workers, redraw when asked.
 *
 * These live here, not in a component, for the same reason setAlphaTabValue does: the api reaches
 * components through useState, and the compiler lint treats anything reached through a hook as
 * immutable. It is right about React data and wrong about a handle to an engine outside React.
 */
function pushSettings(api: AlphaTab.AlphaTabApi, apply: SettingApply): void {
  // The rows that shape the GENERATED MIDI — vibrato, slides, song-book timings, triplet feel —
  // are read when the MIDI is built, and only then. Pushing the settings or redrawing the score
  // changes nothing audible; regenerating the MIDI does.
  //
  // This is the ONE path that interrupts the player: loadMidiForScore -> loadMidiFile -> stop(),
  // which pauses AND rewinds tickPosition to the start of the song or loop. It is deliberate and
  // unavoidable in 1.8.4 — do not try to restore the playhead here, and do not widen the "neither
  // popover blocks the player" promise to cover it.
  if (apply === 'midi') {
    queueMidi(api);
    return;
  }
  api.updateSettings();
  if (apply === 'render') queueRender(api);
}

// ONE redraw per frame, not one per keystroke. A number row reports on every keystroke
// (`SettingRow`'s `onChange`), so typing "100" into Zoom asks for three full relayouts — and a
// relayout is the most expensive thing on this page, felt as a stutter while the player runs.
//
// It is render() that is worth coalescing, and ONLY render(). updateSettings() does the same fixed
// work whatever it is handed: backwards-compatibility, the pitch offsets (a loop over TRACKS, not
// over settings), one assignment into the renderer, and a player rebuild that early-returns unless
// `player.playerMode` itself changed — and it never redraws, because there is no render() inside it
// (AlphaTabApiBase.ts:549-563 and :1670-1708).
//
// The MIDI rebuild is coalesced by the same rule and matters more, because it is the expensive
// branch AND the one that interrupts the player. Measured against the sequence a number row
// actually emits: typing "100" reports 1, 10, 100 while typing and 100 again on blur, so FOUR
// times, and each one regenerated the whole MidiFile (MidiFileGenerator.generate over every bar)
// and then called AlphaSynth.loadMidiFile, which does `this.stop()` and `this.tickPosition = 0` —
// stopping the player and rewinding it, once per keystroke.
//
// Coalescing is safe because applySettingsJson has ALREADY written the value into api.settings
// synchronously before this runs: the deferred call reads the settings tree as it stands a frame
// later, which is the last value typed. Only the rebuild is deferred, never the write.

/** The frame handle for each kind of deferred work, or undefined when nothing is queued. */
interface QueuedFrames {
  render?: number;
  midi?: number;
}

// Keyed by engine INSTANCE, not module-global, and holding the HANDLE rather than a boolean.
//
// Both of those matter, and neither is hypothetical. useAlphaTab builds a new AlphaTabApi whenever
// its [engine] effect re-runs — which Strict Mode deliberately exercises on every mount — and a
// module-global flag cannot tell the instances apart: a frame queued for an api that has since been
// destroyed would suppress a FRESH api's request in the same frame, so the new engine silently
// misses its redraw. Keying on the instance means each api coalesces only against itself.
//
// Keeping the handle is what makes the work cancellable. AlphaTabApiBase.render() carries no
// _isDestroyed guard (unlike changeTrackVolume/Mute/Solo and its siblings), so a frame that
// survives unmount runs against a destroyed renderer from a detached callback nothing in the React
// tree can catch — and the window is widest on a backgrounded tab, where rAF is throttled. The
// cleanup in useAlphaTab cancels through cancelQueuedFrames, beside created.destroy().
//
// A WeakMap rather than a Map: a destroyed api must not be held alive by this bookkeeping, and an
// unmount that somehow misses the cleanup must not leak it either.
const queuedFrames = new WeakMap<AlphaTab.AlphaTabApi, QueuedFrames>();

function queueFrame(api: AlphaTab.AlphaTabApi, kind: keyof QueuedFrames, run: () => void): void {
  const queued = queuedFrames.get(api) ?? {};
  // Compared against undefined, never truthiness: 0 is a legitimate frame handle.
  if (queued[kind] !== undefined) return;
  queued[kind] = requestAnimationFrame(() => {
    // Clear BEFORE running, so work queued from inside the callback is not swallowed by a handle
    // that is about to become stale.
    const current = queuedFrames.get(api);
    if (current) current[kind] = undefined;
    run();
  });
  queuedFrames.set(api, queued);
}

function queueRender(api: AlphaTab.AlphaTabApi): void {
  queueFrame(api, 'render', () => {
    api.render();
  });
}

function queueMidi(api: AlphaTab.AlphaTabApi): void {
  queueFrame(api, 'midi', () => {
    api.loadMidiForScore();
  });
}

/**
 * Drop any frame still queued for this api. Call it from the SAME cleanup that destroys the api.
 *
 * Without it a redraw or a MIDI rebuild queued in the last frame before unmount still fires, on an
 * engine that no longer exists.
 */
export function cancelQueuedFrames(api: AlphaTab.AlphaTabApi): void {
  const queued = queuedFrames.get(api);
  if (!queued) return;
  if (queued.render !== undefined) cancelAnimationFrame(queued.render);
  if (queued.midi !== undefined) cancelAnimationFrame(queued.midi);
  queuedFrames.delete(api);
}

/**
 * fillFromJson, NEVER assignment. The JSON holds plain objects, but RenderingResources holds real
 * model.Color and model.Font instances, and a plain object assigned into the settings tree breaks
 * rendering WITHOUT throwing — the colour and font groups would silently stop working.
 */
export function applySettingsJson(
  api: AlphaTab.AlphaTabApi,
  json: PlayerSettingsJson,
  apply: SettingApply,
): void {
  api.settings.fillFromJson(json as AlphaTab.json.SettingsJson);
  pushSettings(api, apply);
}

/**
 * Notation ONLY, for one track. The other transposition — audio only — is an api method.
 *
 * This does not move the sound, and cannot: 'render' runs updateSettings() plus a redraw, and the
 * transposition reaches the synth only through loadMidiForScore, which updateSettings skips when
 * the player mode has not changed. The row is labelled for what it does.
 */
export function setTrackTransposition(
  api: AlphaTab.AlphaTabApi,
  trackIndex: number,
  semitones: number,
): void {
  const pitches = [...api.settings.notation.transpositionPitches];
  // Densify up to the written index first. The engine's guard is `i < transpositionPitches.length`,
  // not a presence test, so a HOLE below the index is read as `-undefined` — NaN — and stamped onto
  // every lower-indexed staff: garbage drawn pitches, and synth voices keyed NaN that noteOff can
  // never match (NaN !== NaN), so they never stop.
  //
  // The gap is filled with each track's OWN transposition rather than 0, because 0 is not "leave it
  // alone" here — it would erase a transposition the FILE carries, the very thing
  // clearTrackTranspositions above goes out of its way to preserve.
  while (pitches.length <= trackIndex) {
    // The staff stores the NEGATED value, so it is negated back. `=== 0` rather than a bare
    // negation: -(0) is -0, which is arithmetically fine but reads as a bug in a stored array.
    const own = api.score?.tracks[pitches.length]?.staves[0]?.transpositionPitch ?? 0;
    pitches.push(own === 0 ? 0 : -own);
  }
  pitches[trackIndex] = semitones;
  api.settings.notation.transpositionPitches = pitches;
  pushSettings(api, 'render');
}

/**
 * Call this BEFORE the new score reaches the engine — in the open-file path, ahead of
 * renderScore. The pitches are indexed by track and live on the api, so a +2 on one score's second
 * track would otherwise transpose the next score's second track. Clearing AFTER the load does not
 * work: applyPitchOffsets runs at the top of the engine's render path and has already stamped the
 * new score's staves, and its write is guarded by `i < transpositionPitches.length`, so an empty
 * array reaches no track and un-stamps nothing. Clearing first means the new score is never
 * stamped, which also preserves a transposition the FILE itself carries. No redraw: a new score is
 * about to be drawn anyway.
 */
export function clearTrackTranspositions(api: AlphaTab.AlphaTabApi): void {
  if (api.settings.notation.transpositionPitches.length === 0) return;
  api.settings.notation.transpositionPitches = [];
  pushSettings(api, 'settings');
}

/**
 * The Stylesheet group. These live on the SCORE's own stylesheet, not in the settings: a new score
 * brings its own, so the popover re-reads them on every scoreLoaded and nothing here is stored.
 * Enums are reported by NAME, like every other enum row.
 */
export function readStylesheetValues(
  score: AlphaTab.model.Score,
  enumName: (key: StylesheetKey, value: number) => string,
): Record<StylesheetKey, SettingValue> {
  const sheet = score.stylesheet;
  return {
    hideDynamics: sheet.hideDynamics,
    bracketExtendMode: enumName('bracketExtendMode', sheet.bracketExtendMode),
    useSystemSignSeparator: sheet.useSystemSignSeparator,
    globalDisplayTuning: sheet.globalDisplayTuning,
    globalDisplayChordDiagramsOnTop: sheet.globalDisplayChordDiagramsOnTop,
    singleTrackTrackNamePolicy: enumName(
      'singleTrackTrackNamePolicy',
      sheet.singleTrackTrackNamePolicy,
    ),
    multiTrackTrackNamePolicy: enumName(
      'multiTrackTrackNamePolicy',
      sheet.multiTrackTrackNamePolicy,
    ),
    firstSystemTrackNameMode: enumName('firstSystemTrackNameMode', sheet.firstSystemTrackNameMode),
    firstSystemTrackNameOrientation: enumName(
      'firstSystemTrackNameOrientation',
      sheet.firstSystemTrackNameOrientation,
    ),
    otherSystemsTrackNameMode: enumName(
      'otherSystemsTrackNameMode',
      sheet.otherSystemsTrackNameMode,
    ),
    otherSystemsTrackNameOrientation: enumName(
      'otherSystemsTrackNameOrientation',
      sheet.otherSystemsTrackNameOrientation,
    ),
    multiBarRests: sheet.multiTrackMultiBarRest,
  };
}

/**
 * `value` arrives already converted: a boolean, or the enum's NUMBER (the caller holds the
 * namespace and turns the row's name back into it — this file has no runtime AlphaTab).
 */
export function setStylesheetValue(
  api: AlphaTab.AlphaTabApi,
  key: StylesheetKey,
  value: boolean | number,
): void {
  const score = api.score;
  if (!score) return;
  if (key === 'multiBarRests') {
    // The one composite row: the flag alone draws nothing. AlphaTab also wants the set of tracks
    // it applies to — every track when on, none when off.
    const on = Boolean(value);
    score.stylesheet.multiTrackMultiBarRest = on;
    score.stylesheet.perTrackMultiBarRest = on
      ? new Set(score.tracks.map((track) => track.index))
      : null;
  } else {
    // One assignment for eleven keys: the row's control kind already guarantees the type.
    (score.stylesheet as unknown as Record<string, boolean | number>)[key] = value;
  }
  queueRender(api);
}

// An alias, not a second declaration: the one union lives on TrackRow, the component whose props
// define which staff flags exist. Kept under this name because this module's own callers already
// import it as StaffDisplayKey.
export type StaffDisplayKey = StaffToggleKey;

/** A staff flag lives on the score model, not in the settings, so only a redraw is needed. */
export function setStaffDisplay(
  api: AlphaTab.AlphaTabApi,
  trackIndex: number,
  staffIndex: number,
  key: StaffDisplayKey,
  next: boolean,
): void {
  const staff = api.score?.tracks[trackIndex]?.staves[staffIndex];
  if (!staff) return;
  staff[key] = next;
  queueRender(api);
}
