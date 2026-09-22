import type { PlayerSettingsJson } from './settings-paths';
import type { SettingApply, StylesheetKey } from './settings-schema';
import type * as AlphaTab from '@coderline/alphatab';
import type { SettingValue } from '@notation-hero/client';

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
    api.loadMidiForScore();
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
let renderQueued = false;
function queueRender(api: AlphaTab.AlphaTabApi): void {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    api.render();
  });
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

/** Notation AND audio for one track. The other transposition — audio only — is an api method. */
export function setTrackTransposition(
  api: AlphaTab.AlphaTabApi,
  trackIndex: number,
  semitones: number,
): void {
  const pitches = [...api.settings.notation.transpositionPitches];
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

export type StaffDisplayKey =
  | 'showStandardNotation'
  | 'showSlash'
  | 'showNumbered'
  | 'showTablature';

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
