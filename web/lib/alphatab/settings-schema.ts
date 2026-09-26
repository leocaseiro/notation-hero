import type { AlphaTabEngine } from './engine';
import type { PlayerSettingsJson } from './settings-paths';
import type { SettingControl } from '@notation-hero/client';

export { readSettingValue, writeSettingValue } from './settings-paths';
export type { PlayerSettingsJson } from './settings-paths';

/** The AlphaTabApi properties the Player group edits. PlayerShell owns a single writer for each. */
export type ApiValueKey =
  | 'playbackSpeed'
  | 'masterVolume'
  | 'metronomeVolume'
  | 'countInVolume'
  | 'isLooping';

export type SettingAction = 'export-midi' | 'export-guitar-pro';

/**
 * How a settings row takes effect. 'render' pushes the settings and redraws. 'settings' pushes
 * only — the player-side rows that change nothing drawn. 'midi' regenerates the MIDI, which is the
 * ONLY thing that makes the vibrato, slide, song-book and triplet-feel rows audible.
 */
export type SettingApply = 'render' | 'settings' | 'midi';

/**
 * The score-stylesheet properties the Stylesheet group edits. AlphaTab's runtime type is
 * `RenderStylesheet` and it is NOT exported (there is no `AlphaTab.model.Stylesheet`), which is why
 * this union is hand-written. 'multiBarRests' is a composite this app defines: one toggle that writes
 * `multiTrackMultiBarRest`, and sets `perTrackMultiBarRest` to every track's index when on, null when off.
 */
export type StylesheetKey =
  | 'hideDynamics'
  | 'bracketExtendMode'
  | 'useSystemSignSeparator'
  | 'globalDisplayTuning'
  | 'globalDisplayChordDiagramsOnTop'
  | 'singleTrackTrackNamePolicy'
  | 'multiTrackTrackNamePolicy'
  | 'firstSystemTrackNameMode'
  | 'firstSystemTrackNameOrientation'
  | 'otherSystemsTrackNameMode'
  | 'otherSystemsTrackNameOrientation'
  | 'multiBarRests';

interface SettingRowBase {
  /** Unique across ALL eight groups — it becomes a DOM id, and axe fails a duplicate. */
  id: string;
  label: string;
  control: SettingControl;
  /** Rendered under the label by `SettingRow`'s `FieldDescription`. Every `stylesheet` row carries
   *  one, because those twelve are the exception to the panel's "survives a reload" promise. */
  description?: string;
}

export type SettingDescriptor =
  | (SettingRowBase & {
      source: 'settings';
      /** Dot path into the settings JSON, e.g. 'display.scale' — or 'display.padding.0' for an array. */
      path: string;
      apply: SettingApply;
    })
  // An AlphaTabApi PROPERTY, not a settings key. It must never get a `path`: fillFromJson ignores
  // a key it does not know, so the row would move and nothing would change.
  | (SettingRowBase & { source: 'api'; key: ApiValueKey })
  // A property of the OPEN SCORE's stylesheet, on the score model. Not in the settings JSON
  // either, and never stored: a new score brings its own.
  | (SettingRowBase & { source: 'stylesheet'; key: StylesheetKey })
  | (SettingRowBase & { source: 'action'; action: SettingAction });

export interface SettingGroup {
  id: string;
  title: string;
  settings: SettingDescriptor[];
}

/** The twelve Stylesheet rows are the open score's own values, not settings — say so on each row. */
const STYLESHEET_NOTE =
  'Belongs to the score that is open. Another score brings its own, and this is never saved.';

/**
 * The fourteen Player rows that shape the GENERATED MIDI. Nothing changes until the MIDI is
 * rebuilt, and rebuilding it stops playback and rewinds to the start of the song or the loop — say
 * so on every one of them, since nothing else on screen would tell a person that.
 */
const MIDI_APPLY_NOTE =
  'Rebuilds the MIDI to take effect — this stops playback and rewinds to the start.';

/**
 * Turns an AlphaTab enum object into the option array a client/ row takes, pairing each member
 * with hand-written copy instead of showing the enum's own identifier to the user.
 *
 * TypeScript's numeric enums are bidirectional, so Object.keys yields both the names and the
 * numbers; keeping only the non-numeric keys drops the reverse half.
 *
 * The option VALUE is still the enum's NAME, not its number — `labels` only ever supplies the
 * LABEL. fillFromJson reads an enum from either (case-insensitively, for a name), and a name keeps
 * the stored JSON readable and lets the shipped defaults below be a module constant — a number
 * would need the runtime enum, which no module-scope constant may touch. Writing a translated or
 * reworded VALUE here would make the row a silent no-op: the control would move, the stored JSON
 * would update, and fillFromJson would ignore a name it does not recognise.
 *
 * `labels` is a hand-written map, one entry per member whose meaning this file's author has
 * actually read (in the library's own doc comments) and can restate in plain words. A member the
 * running library has that the map does not — added by a later `@coderline/alphatab` release —
 * still appears in the dropdown: it falls back to its own enum key rather than silently
 * disappearing from the list.
 */
function enumOptions(
  enumObject: Record<string, string | number>,
  labels: Partial<Record<string, string>>,
): { value: string; label: string }[] {
  return Object.keys(enumObject)
    .filter((key) => Number.isNaN(Number(key)))
    .map((key) => ({ value: key, label: labels[key] ?? key }));
}

// Hand-written copy for every enum-backed dropdown, one map per AlphaTab enum. Three of them are
// each shared by two rows (see the comment on each) — the label set belongs to the ENUM, not to
// any one row, so both rows read identically whenever they mean the same thing.

/** player.playerMode — "Playback source". What actually produces sound for each mode. */
const PLAYER_MODE_LABELS: Partial<Record<string, string>> = {
  Disabled: 'No playback',
  EnabledAutomatic: 'The backing track when there is one, otherwise the synthesizer',
  EnabledSynthesizer: 'The synthesizer, always',
  EnabledBackingTrack: 'The backing track only, if the file has one',
  // This app wires up no external-media handler, so this mode plays nothing here — say that
  // plainly instead of promising a source the app cannot provide.
  EnabledExternalMedia: 'External audio, not available in this app',
};

/** player.scrollMode — "Auto-scroll style". */
const SCROLL_MODE_LABELS: Partial<Record<string, string>> = {
  Off: 'Do not scroll automatically',
  Continuous: 'Follow the cursor as it moves',
  OffScreen: 'Jump only when the cursor leaves the screen',
  Smooth: 'Scroll smoothly at a steady speed',
};

/** display.layoutMode — "Layout". */
const LAYOUT_MODE_LABELS: Partial<Record<string, string>> = {
  Page: 'Wrap bars into rows, like a page',
  Horizontal: 'Lay out every bar in one long row',
  Parchment: "Wrap into rows sized by the file's own layout",
};

/** display.systemsLayoutMode — "Row layout source". */
const SYSTEMS_LAYOUT_MODE_LABELS: Partial<Record<string, string>> = {
  Automatic: 'Decide automatically',
  UseModelLayout: 'Use the row breaks stored in the file',
};

/** notation.fingeringMode — "Fingering display". */
const FINGERING_MODE_LABELS: Partial<Record<string, string>> = {
  ScoreDefault: 'On the standard notation staff',
  ScoreForcePiano: 'On the standard notation staff, numbered like piano fingering',
  SingleNoteEffectBand: 'Above the tab, for single notes only',
  SingleNoteEffectBandForcePiano:
    'Above the tab, for single notes only, numbered like piano fingering',
};

/** notation.rhythmMode — "Tab rhythm notation". */
const TAB_RHYTHM_MODE_LABELS: Partial<Record<string, string>> = {
  Hidden: 'Hidden',
  ShowWithBeams: 'Shown, with separate beams per beat',
  ShowWithBars: 'Shown, connected like standard notation',
  Automatic: 'Shown automatically when standard notation is hidden',
};

/** stylesheet.bracketExtendMode — "Brackets and braces". */
const BRACKET_EXTEND_MODE_LABELS: Partial<Record<string, string>> = {
  NoBrackets: 'None',
  GroupStaves: "Group each track's staves",
  GroupSimilarInstruments: 'Group tracks that share an instrument',
};

/**
 * TrackNamePolicy — whether a track name shows at all. Shared by
 * singleTrackTrackNamePolicy ("Track name (single-track view)") and multiTrackTrackNamePolicy
 * ("Track name (multi-track view)").
 */
const TRACK_NAME_POLICY_LABELS: Partial<Record<string, string>> = {
  Hidden: 'Hidden',
  FirstSystem: 'Shown on the first row only',
  AllSystems: 'Shown on every row',
};

/**
 * TrackNameMode — how much of the name shows (full or abbreviated). Shared by the two "...track
 * name length" rows (first-system and other-systems). NOT the same enum as
 * TRACK_NAME_ORIENTATION_LABELS below — that one belongs to the "...track name direction" rows.
 */
const TRACK_NAME_MODE_LABELS: Partial<Record<string, string>> = {
  FullName: 'Full name',
  ShortName: 'Short name (abbreviated)',
};

/**
 * TrackNameOrientation — which way the name reads (horizontal or vertical). Shared by the two
 * "...track name direction" rows (first-system and other-systems). NOT the same enum as
 * TRACK_NAME_MODE_LABELS above — that one belongs to the "...track name length" rows.
 */
const TRACK_NAME_ORIENTATION_LABELS: Partial<Record<string, string>> = {
  Horizontal: 'Horizontal',
  Vertical: 'Vertical, rotated upright',
};

/**
 * Exactly the colour notations AlphaTab's own Color.fromJson parses: 3-, 4-, 6- or 8-digit hex,
 * and
 * lowercase rgb()/rgba(). The 4-digit form is `#rgba`, the alpha shorthand — measured against the
 * pinned engine, Color.fromJson('#f00f') returns #FF0000, so refusing it here would make the
 * restore path reset a colour the engine accepts and blame the stored value for it.
 * Deliberately NOT `CSS.supports('color', …)`, which was the first attempt
 * and is the wrong authority in both directions. Color.fromJson returns `null` WITHOUT throwing for
 * `red`, `hsl(...)`, `rgb(0 0 0 / 50%)` and `RGBA(...)` — all of which CSS.supports accepts — so the
 * engine never rejects them, the settings funnel's try/catch never fires, the value is persisted,
 * and the renderer then dereferences `null.rgba` inside a queued frame, outside any catch. Encoding
 * the grammar here also keeps the module free of a value import of the engine, which the web/
 * ESLint fence forbids, and free of the `CSS` global, which the test environment does not provide.
 */
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
// Whitespace is stripped before this runs, so the pattern carries none: `\s*` between every token
// is what made the single combined expression backtrack super-linearly. The alpha is an
// unambiguous alternation for the same reason — `\d*\.?\d+` can split a digit run two ways.
const RGB_COLOR = /^rgba?\(\d{1,3},\d{1,3},\d{1,3}(?:,(?:\d+(?:\.\d+)?|\.\d+))?\)$/;

const isCssColor = (draft: string): boolean => {
  const value = draft.trim();
  if (HEX_COLOR.test(value)) return true;
  // Only inside the parentheses is whitespace insignificant to AlphaTab, and a hex value has
  // already returned, so nothing here can silently join two meaningful tokens.
  return RGB_COLOR.test(value.replaceAll(/\s+/g, ''));
};

/**
 * Every font row is a CSS font shorthand, and AlphaTab's own parser THROWS on a partial one:
 * an empty field or a lone `bold` raises 'Missing font size', and a lone `12px` raises
 * 'Missing font list'. SettingRow only gates a text row when the row supplies this, so without it
 * an unparseable draft reaches both the engine and storage.
 *
 * The accepted units are exactly the ones Font.fromJson converts — px, pt, em and the CSS keyword
 * sizes. `rem` and a bare number with no unit are rejected on purpose: the engine does not throw
 * on them, it silently falls back to 12px, which is worse than being told the value is wrong.
 */
const FONT_STYLE_OR_WEIGHT = /^(?:normal|italic|oblique|small-caps|bold|bolder|lighter|[1-9]00)$/i;
const FONT_SIZE =
  /^(?:\d+(?:\.\d+)?(?:px|pt|em)|xx-small|x-small|smaller|small|medium|larger|large|x-large|xx-large)$/i;

const isFontShorthand = (draft: string): boolean => {
  // The family list reaches the renderer unescaped: SvgCanvas builds `<text … style='… font:${…}'>`
  // as a SINGLE-quoted attribute and assigns it as markup, so an apostrophe in a family name closes
  // that attribute and everything after it is parsed as more attributes. Angle brackets open a tag
  // outright. Neither belongs in a font family, and a stored value re-arms on every later visit, so
  // they are refused at the field. A double quote is safe inside a single-quoted attribute and stays
  // allowed, because `12px "Times New Roman"` is a legitimate value.
  if (/['<>]/.test(draft)) return false;
  const parts = draft.trim().split(/\s+/);
  let index = 0;
  while (index < parts.length && FONT_STYLE_OR_WEIGHT.test(parts[index])) index += 1;
  // A size token, and then at least one family token after it — the two things whose absence makes
  // AlphaTab's parser throw.
  return index < parts.length - 1 && FONT_SIZE.test(parts[index]);
};

/**
 * The eight groups, in the order the popover shows them. They stay exactly these: v0.1 layers
 * search and tabs over the same rows, so a re-grouping now would be re-done then.
 *
 * Built from the engine rather than as a module constant, because every enum here is a RUNTIME
 * AlphaTab value and no module-scope constant may reference one — that needs the value import the
 * ESLint guard forbids.
 */
export function buildSettingGroups(engine: AlphaTabEngine): SettingGroup[] {
  return [
    {
      id: 'player',
      title: 'Player',
      settings: [
        // First in the group: it is the control a drummer reaches for most. A PERCENTAGE, not the
        // raw multiplier — the header's BPM stepper leaves the multiplier at values like 0.8916…,
        // which nobody can read in a number field. The shell converts at its own boundary. The
        // range is the engine's own clamp (0.125-8), the same one the header's tempo control uses.
        {
          id: 'player-speed',
          source: 'api',
          key: 'playbackSpeed',
          label: 'Playback speed (%)',
          control: { kind: 'range', min: 12.5, max: 800, step: 0.5 },
        },
        {
          id: 'player-master-volume',
          source: 'api',
          key: 'masterVolume',
          label: 'Master volume',
          control: { kind: 'range', min: 0, max: 1, step: 0.05 },
        },
        {
          id: 'player-metronome-volume',
          source: 'api',
          key: 'metronomeVolume',
          label: 'Metronome volume',
          control: { kind: 'range', min: 0, max: 1, step: 0.05 },
          // This row and the count-in-volume row beside it disable on `mixUnavailable` while the
          // file plays its own recording, and SHOW it as their description — the same rule, and
          // the same reason string, as the transport's Metronome and Count-In buttons. They are
          // the only two Player rows that do.
        },
        {
          id: 'player-count-in-volume',
          source: 'api',
          key: 'countInVolume',
          label: 'Count-in volume',
          control: { kind: 'range', min: 0, max: 1, step: 0.05 },
        },
        {
          id: 'player-loop',
          source: 'api',
          key: 'isLooping',
          label: 'Loop',
          control: { kind: 'toggle' },
        },

        // Eight rows that push the settings but redraw nothing.
        {
          id: 'player-mode',
          source: 'settings',
          label: 'Playback source',
          path: 'player.playerMode',
          control: { kind: 'select', options: enumOptions(engine.PlayerMode, PLAYER_MODE_LABELS) },
          apply: 'settings',
        },
        {
          id: 'player-show-cursor',
          source: 'settings',
          label: 'Show the playback cursor',
          path: 'player.enableCursor',
          control: { kind: 'toggle' },
          // Nothing is redrawn: the cursor is the player's, not the score's.
          apply: 'settings',
        },
        {
          id: 'player-animate-cursor',
          source: 'settings',
          label: 'Animate the beat cursor',
          path: 'player.enableAnimatedBeatCursor',
          control: { kind: 'toggle' },
          apply: 'settings',
        },
        {
          id: 'player-highlight-elements',
          source: 'settings',
          label: 'Highlight the note being played',
          path: 'player.enableElementHighlighting',
          control: { kind: 'toggle' },
          apply: 'settings',
        },
        {
          id: 'player-user-interaction',
          source: 'settings',
          label: 'Click a beat to seek there',
          path: 'player.enableUserInteraction',
          control: { kind: 'toggle' },
          apply: 'settings',
        },
        {
          id: 'player-scroll-offset-x',
          source: 'settings',
          label: 'Auto-scroll offset: horizontal',
          path: 'player.scrollOffsetX',
          control: { kind: 'number' },
          apply: 'settings',
        },
        {
          id: 'player-scroll-offset-y',
          source: 'settings',
          label: 'Auto-scroll offset: vertical',
          path: 'player.scrollOffsetY',
          control: { kind: 'number' },
          apply: 'settings',
        },
        {
          id: 'player-scroll-mode',
          source: 'settings',
          label: 'Auto-scroll style',
          path: 'player.scrollMode',
          control: { kind: 'select', options: enumOptions(engine.ScrollMode, SCROLL_MODE_LABELS) },
          apply: 'settings',
        },

        // Fourteen rows that shape the GENERATED MIDI: silent until it is rebuilt.
        {
          id: 'player-songbook-bend-duration',
          source: 'settings',
          label: 'Bend duration (song-book notation)',
          path: 'player.songBookBendDuration',
          control: { kind: 'number', min: 0 },
          apply: 'midi',
          description: MIDI_APPLY_NOTE,
        },
        {
          id: 'player-songbook-dip-duration',
          source: 'settings',
          label: 'Whammy dip duration (song-book notation)',
          path: 'player.songBookDipDuration',
          control: { kind: 'number', min: 0 },
          apply: 'midi',
          description: MIDI_APPLY_NOTE,
        },
        {
          id: 'player-vibrato-note-wide-length',
          source: 'settings',
          label: 'Wide note vibrato: length',
          path: 'player.vibrato.noteWideLength',
          control: { kind: 'number', min: 0 },
          // Read when the MIDI is BUILT, and only then. 'render' here would be a silent no-op.
          apply: 'midi',
          description: MIDI_APPLY_NOTE,
        },
        {
          id: 'player-vibrato-note-wide-amplitude',
          source: 'settings',
          label: 'Wide note vibrato: amplitude',
          path: 'player.vibrato.noteWideAmplitude',
          control: { kind: 'number', min: 0, step: 0.1 },
          apply: 'midi',
          description: MIDI_APPLY_NOTE,
        },
        {
          id: 'player-vibrato-note-slight-length',
          source: 'settings',
          label: 'Slight note vibrato: length',
          path: 'player.vibrato.noteSlightLength',
          control: { kind: 'number', min: 0 },
          apply: 'midi',
          description: MIDI_APPLY_NOTE,
        },
        {
          id: 'player-vibrato-note-slight-amplitude',
          source: 'settings',
          label: 'Slight note vibrato: amplitude',
          path: 'player.vibrato.noteSlightAmplitude',
          control: { kind: 'number', min: 0, step: 0.1 },
          apply: 'midi',
          description: MIDI_APPLY_NOTE,
        },
        {
          id: 'player-vibrato-beat-wide-length',
          source: 'settings',
          label: 'Wide beat vibrato: length',
          path: 'player.vibrato.beatWideLength',
          control: { kind: 'number', min: 0 },
          apply: 'midi',
          description: MIDI_APPLY_NOTE,
        },
        {
          id: 'player-vibrato-beat-wide-amplitude',
          source: 'settings',
          label: 'Wide beat vibrato: amplitude',
          path: 'player.vibrato.beatWideAmplitude',
          control: { kind: 'number', min: 0, step: 0.1 },
          apply: 'midi',
          description: MIDI_APPLY_NOTE,
        },
        {
          id: 'player-vibrato-beat-slight-length',
          source: 'settings',
          label: 'Slight beat vibrato: length',
          path: 'player.vibrato.beatSlightLength',
          control: { kind: 'number', min: 0 },
          apply: 'midi',
          description: MIDI_APPLY_NOTE,
        },
        {
          id: 'player-vibrato-beat-slight-amplitude',
          source: 'settings',
          label: 'Slight beat vibrato: amplitude',
          path: 'player.vibrato.beatSlightAmplitude',
          control: { kind: 'number', min: 0, step: 0.1 },
          apply: 'midi',
          description: MIDI_APPLY_NOTE,
        },
        {
          id: 'player-slide-simple-pitch-offset',
          source: 'settings',
          label: 'Simple slide: pitch offset',
          path: 'player.slide.simpleSlidePitchOffset',
          control: { kind: 'number', min: 0 },
          apply: 'midi',
          description: MIDI_APPLY_NOTE,
        },
        {
          id: 'player-slide-simple-duration-ratio',
          source: 'settings',
          label: 'Simple slide: duration',
          path: 'player.slide.simpleSlideDurationRatio',
          control: { kind: 'number', min: 0, max: 1, step: 0.05 },
          apply: 'midi',
          description: MIDI_APPLY_NOTE,
        },
        {
          id: 'player-slide-shift-duration-ratio',
          source: 'settings',
          label: 'Shift and legato slide: duration',
          path: 'player.slide.shiftSlideDurationRatio',
          control: { kind: 'number', min: 0, max: 1, step: 0.05 },
          apply: 'midi',
          description: MIDI_APPLY_NOTE,
        },
        {
          id: 'player-play-triplet-feel',
          source: 'settings',
          label: 'Play the triplet feel',
          path: 'player.playTripletFeel',
          control: { kind: 'toggle' },
          apply: 'midi',
          description: MIDI_APPLY_NOTE,
        },
      ],
    },
    {
      id: 'display-general',
      title: 'Display: general',
      settings: [
        {
          id: 'display-engine',
          source: 'settings',
          label: 'Renderer',
          path: 'core.engine',
          control: {
            kind: 'select',
            options: [
              { value: 'svg', label: 'SVG' },
              { value: 'html5', label: 'HTML5 canvas' },
            ],
          },
          apply: 'render',
        },
        {
          id: 'display-scale',
          source: 'settings',
          label: 'Zoom',
          path: 'display.scale',
          control: { kind: 'range', min: 0.25, max: 3, step: 0.05 },
          apply: 'render',
        },
        {
          id: 'display-stretch-force',
          source: 'settings',
          label: 'Note spacing',
          path: 'display.stretchForce',
          control: { kind: 'number', min: 0.1, step: 0.1 },
          apply: 'render',
        },
        {
          id: 'display-layout-mode',
          source: 'settings',
          label: 'Layout',
          path: 'display.layoutMode',
          control: { kind: 'select', options: enumOptions(engine.LayoutMode, LAYOUT_MODE_LABELS) },
          apply: 'render',
        },
        {
          id: 'display-bars-per-row',
          source: 'settings',
          label: 'Bars per row (-1 = automatic)',
          path: 'display.barsPerRow',
          control: { kind: 'number', min: -1 },
          apply: 'render',
        },
        {
          id: 'display-start-bar',
          source: 'settings',
          label: 'Start at bar',
          path: 'display.startBar',
          control: { kind: 'number', min: 1 },
          apply: 'render',
        },
        {
          id: 'display-bar-count',
          source: 'settings',
          label: 'Bars to display (-1 = all)',
          path: 'display.barCount',
          control: { kind: 'number', min: -1 },
          apply: 'render',
        },
        {
          id: 'display-justify-last-system',
          source: 'settings',
          label: 'Justify the last row',
          path: 'display.justifyLastSystem',
          control: { kind: 'toggle' },
          apply: 'render',
        },
        {
          id: 'display-systems-layout-mode',
          source: 'settings',
          label: 'Row layout source',
          path: 'display.systemsLayoutMode',
          control: {
            kind: 'select',
            options: enumOptions(engine.SystemsLayoutMode, SYSTEMS_LAYOUT_MODE_LABELS),
          },
          apply: 'render',
        },
      ],
    },
    {
      id: 'display-colors',
      title: 'Display: colors',
      settings: [
        {
          id: 'display-color-staff-line',
          source: 'settings',
          label: 'Staff lines',
          path: 'display.resources.staffLineColor',
          control: { kind: 'color' },
          apply: 'render',
        },
        {
          id: 'display-color-bar-separator',
          source: 'settings',
          label: 'Bar separators',
          path: 'display.resources.barSeparatorColor',
          control: { kind: 'color' },
          apply: 'render',
        },
        {
          id: 'display-color-bar-number',
          source: 'settings',
          label: 'Bar numbers',
          path: 'display.resources.barNumberColor',
          control: { kind: 'color' },
          apply: 'render',
        },
        {
          id: 'display-color-main-glyph',
          source: 'settings',
          label: 'Primary voice',
          path: 'display.resources.mainGlyphColor',
          control: { kind: 'color' },
          apply: 'render',
        },
        {
          id: 'display-color-secondary-glyph',
          source: 'settings',
          label: 'Secondary voices',
          path: 'display.resources.secondaryGlyphColor',
          // A text row, not a swatch: this one default carries an alpha channel, and
          // <input type="color"> silently rewrites anything that is not a plain #rrggbb to
          // #000000 — so a swatch here reported black whatever the engine held, and touching it
          // threw the alpha away. Same deferred-commit control the font rows use.
          control: { kind: 'text', validate: isCssColor },
          apply: 'render',
        },
        {
          id: 'display-color-score-info',
          source: 'settings',
          label: 'Song info',
          path: 'display.resources.scoreInfoColor',
          control: { kind: 'color' },
          apply: 'render',
        },
      ],
    },
    {
      id: 'display-fonts',
      title: 'Display: fonts',
      settings: [
        {
          id: 'display-font-copyright',
          source: 'settings',
          label: 'Copyright line',
          path: 'display.resources.elementFonts.ScoreCopyright',
          control: { kind: 'text', validate: isFontShorthand },
          apply: 'render',
        },
        {
          id: 'display-font-title',
          source: 'settings',
          label: 'Title',
          path: 'display.resources.elementFonts.ScoreTitle',
          control: { kind: 'text', validate: isFontShorthand },
          apply: 'render',
        },
        {
          id: 'display-font-subtitle',
          source: 'settings',
          label: 'Subtitle',
          path: 'display.resources.elementFonts.ScoreSubTitle',
          control: { kind: 'text', validate: isFontShorthand },
          apply: 'render',
        },
        {
          id: 'display-font-words',
          source: 'settings',
          label: 'Lyrics',
          path: 'display.resources.elementFonts.ScoreWords',
          control: { kind: 'text', validate: isFontShorthand },
          apply: 'render',
        },
        {
          id: 'display-font-beat-timer',
          source: 'settings',
          label: 'Beat timer',
          path: 'display.resources.elementFonts.EffectBeatTimer',
          control: { kind: 'text', validate: isFontShorthand },
          apply: 'render',
        },
        {
          id: 'display-font-directions',
          source: 'settings',
          label: 'Directions text',
          path: 'display.resources.elementFonts.EffectDirections',
          control: { kind: 'text', validate: isFontShorthand },
          apply: 'render',
        },
        {
          id: 'display-font-chord-fretboard',
          source: 'settings',
          label: 'Chord diagram fret numbers',
          path: 'display.resources.elementFonts.ChordDiagramFretboardNumbers',
          control: { kind: 'text', validate: isFontShorthand },
          apply: 'render',
        },
        {
          id: 'display-font-marker',
          source: 'settings',
          label: 'Section markers',
          path: 'display.resources.elementFonts.EffectMarker',
          control: { kind: 'text', validate: isFontShorthand },
          apply: 'render',
        },
        {
          id: 'display-font-bar-number',
          source: 'settings',
          label: 'Bar numbers',
          path: 'display.resources.elementFonts.BarNumber',
          control: { kind: 'text', validate: isFontShorthand },
          apply: 'render',
        },
        {
          id: 'display-font-numbered-notation',
          source: 'settings',
          label: 'Numbered notation',
          path: 'display.resources.numberedNotationFont',
          control: { kind: 'text', validate: isFontShorthand },
          apply: 'render',
        },
        {
          id: 'display-font-tablature',
          source: 'settings',
          label: 'Tablature numbers',
          path: 'display.resources.tablatureFont',
          control: { kind: 'text', validate: isFontShorthand },
          apply: 'render',
        },
        {
          id: 'display-font-grace',
          source: 'settings',
          label: 'Grace notes',
          path: 'display.resources.graceFont',
          control: { kind: 'text', validate: isFontShorthand },
          apply: 'render',
        },
      ],
    },
    {
      id: 'display-paddings',
      title: 'Display: paddings',
      settings: [
        {
          id: 'display-padding-horizontal',
          source: 'settings',
          label: 'Padding: left and right',
          path: 'display.padding.0',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'display-padding-vertical',
          source: 'settings',
          label: 'Padding: top and bottom',
          path: 'display.padding.1',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'display-padding-first-system-top',
          source: 'settings',
          label: 'First row: top padding',
          path: 'display.firstSystemPaddingTop',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'display-padding-system-top',
          source: 'settings',
          label: 'Row: top padding',
          path: 'display.systemPaddingTop',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'display-padding-last-system-bottom',
          source: 'settings',
          label: 'Last row: bottom padding',
          path: 'display.lastSystemPaddingBottom',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'display-padding-system-bottom',
          source: 'settings',
          label: 'Row: bottom padding',
          path: 'display.systemPaddingBottom',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'display-padding-label-left',
          source: 'settings',
          label: 'Track name: left padding',
          path: 'display.systemLabelPaddingLeft',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'display-padding-label-right',
          source: 'settings',
          label: 'Track name: right padding',
          path: 'display.systemLabelPaddingRight',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'display-padding-accolade-right',
          source: 'settings',
          label: 'Brace: right padding',
          path: 'display.accoladeBarPaddingRight',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'display-padding-notation-staff-top',
          source: 'settings',
          label: 'Notation staff: top padding',
          path: 'display.notationStaffPaddingTop',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'display-padding-notation-staff-bottom',
          source: 'settings',
          label: 'Notation staff: bottom padding',
          path: 'display.notationStaffPaddingBottom',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'display-padding-effect-staff-top',
          source: 'settings',
          label: 'Effect band: top padding',
          path: 'display.effectStaffPaddingTop',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'display-padding-effect-staff-bottom',
          source: 'settings',
          label: 'Effect band: bottom padding',
          path: 'display.effectStaffPaddingBottom',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'display-padding-first-staff-left',
          source: 'settings',
          label: 'First staff: left padding',
          path: 'display.firstStaffPaddingLeft',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'display-padding-staff-left',
          source: 'settings',
          label: 'Staff: left padding',
          path: 'display.staffPaddingLeft',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
      ],
    },
    {
      id: 'notation',
      title: 'Notation',
      settings: [
        {
          id: 'notation-fingering-mode',
          source: 'settings',
          label: 'Fingering display',
          path: 'notation.fingeringMode',
          control: {
            kind: 'select',
            options: enumOptions(engine.FingeringMode, FINGERING_MODE_LABELS),
          },
          apply: 'render',
        },
        {
          id: 'notation-rhythm-mode',
          source: 'settings',
          label: 'Tab rhythm notation',
          path: 'notation.rhythmMode',
          control: {
            kind: 'select',
            options: enumOptions(engine.TabRhythmMode, TAB_RHYTHM_MODE_LABELS),
          },
          apply: 'render',
        },
        {
          id: 'notation-rhythm-height',
          source: 'settings',
          label: 'Tab rhythm notation height',
          path: 'notation.rhythmHeight',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
        {
          id: 'notation-small-grace-tab-notes',
          source: 'settings',
          label: 'Small grace notes on tab',
          path: 'notation.smallGraceTabNotes',
          control: { kind: 'toggle' },
          apply: 'render',
        },
        {
          id: 'notation-extend-bend-arrows',
          source: 'settings',
          label: 'Extend bend arrows across tied notes',
          path: 'notation.extendBendArrowsOnTiedNotes',
          control: { kind: 'toggle' },
          apply: 'render',
        },
        {
          id: 'notation-extend-line-effects',
          source: 'settings',
          label: "Extend line effects to the beat's end",
          path: 'notation.extendLineEffectsToBeatEnd',
          control: { kind: 'toggle' },
          apply: 'render',
        },
        {
          id: 'notation-slur-height',
          source: 'settings',
          label: 'Slur height',
          path: 'notation.slurHeight',
          control: { kind: 'number', min: 0 },
          apply: 'render',
        },
      ],
    },
    {
      id: 'stylesheet',
      title: 'Stylesheet',
      settings: [
        // Every row in this group is exempt from the panel's "survives a reload" promise, and the
        // exemption has to be ON SCREEN: someone who turns one on and opens the next score finds it
        // back off, with nothing to distinguish that from a bug. One sentence, the same on all
        // twelve — they are all the open score's own value.
        {
          id: 'stylesheet-hide-dynamics',
          source: 'stylesheet',
          key: 'hideDynamics',
          label: 'Hide dynamics markings',
          description: STYLESHEET_NOTE,
          control: { kind: 'toggle' },
        },
        {
          id: 'stylesheet-bracket-extend',
          source: 'stylesheet',
          key: 'bracketExtendMode',
          label: 'Brackets and braces',
          description: STYLESHEET_NOTE,
          control: {
            kind: 'select',
            options: enumOptions(engine.model.BracketExtendMode, BRACKET_EXTEND_MODE_LABELS),
          },
        },
        {
          id: 'stylesheet-system-sign-separator',
          source: 'stylesheet',
          key: 'useSystemSignSeparator',
          label: 'Separator between system signs',
          description: STYLESHEET_NOTE,
          control: { kind: 'toggle' },
        },
        {
          id: 'stylesheet-global-display-tuning',
          source: 'stylesheet',
          key: 'globalDisplayTuning',
          label: 'Show tuning on every staff',
          description: STYLESHEET_NOTE,
          control: { kind: 'toggle' },
        },
        {
          id: 'stylesheet-chord-diagrams-on-top',
          source: 'stylesheet',
          key: 'globalDisplayChordDiagramsOnTop',
          label: 'Show chord diagrams above every row',
          description: STYLESHEET_NOTE,
          control: { kind: 'toggle' },
        },
        {
          id: 'stylesheet-single-track-name-policy',
          source: 'stylesheet',
          key: 'singleTrackTrackNamePolicy',
          label: 'Track name (single-track view)',
          description: STYLESHEET_NOTE,
          control: {
            kind: 'select',
            options: enumOptions(engine.model.TrackNamePolicy, TRACK_NAME_POLICY_LABELS),
          },
        },
        {
          id: 'stylesheet-multi-track-name-policy',
          source: 'stylesheet',
          key: 'multiTrackTrackNamePolicy',
          label: 'Track name (multi-track view)',
          description: STYLESHEET_NOTE,
          control: {
            kind: 'select',
            options: enumOptions(engine.model.TrackNamePolicy, TRACK_NAME_POLICY_LABELS),
          },
        },
        {
          id: 'stylesheet-first-system-name-mode',
          source: 'stylesheet',
          key: 'firstSystemTrackNameMode',
          label: 'First row: track name length',
          description: STYLESHEET_NOTE,
          control: {
            kind: 'select',
            options: enumOptions(engine.model.TrackNameMode, TRACK_NAME_MODE_LABELS),
          },
        },
        // The fork binds this row's neighbour — otherSystemsTrackNameOrientation — to THIS enum
        // (TrackNameMode) a second time by mistake. TrackNameOrientation is the one that belongs to
        // an "orientation" row; TrackNameMode belongs to a "length" row, as it does two rows up.
        {
          id: 'stylesheet-first-system-name-orientation',
          source: 'stylesheet',
          key: 'firstSystemTrackNameOrientation',
          label: 'First row: track name direction',
          description: STYLESHEET_NOTE,
          control: {
            kind: 'select',
            options: enumOptions(engine.model.TrackNameOrientation, TRACK_NAME_ORIENTATION_LABELS),
          },
        },
        {
          id: 'stylesheet-other-systems-name-mode',
          source: 'stylesheet',
          key: 'otherSystemsTrackNameMode',
          label: 'Later rows: track name length',
          description: STYLESHEET_NOTE,
          control: {
            kind: 'select',
            options: enumOptions(engine.model.TrackNameMode, TRACK_NAME_MODE_LABELS),
          },
        },
        {
          id: 'stylesheet-other-systems-name-orientation',
          source: 'stylesheet',
          key: 'otherSystemsTrackNameOrientation',
          label: 'Later rows: track name direction',
          description: STYLESHEET_NOTE,
          control: {
            kind: 'select',
            options: enumOptions(engine.model.TrackNameOrientation, TRACK_NAME_ORIENTATION_LABELS),
          },
        },
        {
          id: 'stylesheet-multi-bar-rests',
          source: 'stylesheet',
          key: 'multiBarRests',
          label: 'Combine full-bar rests',
          description: STYLESHEET_NOTE,
          control: { kind: 'toggle' },
        },
      ],
    },
    {
      id: 'export',
      title: 'Export',
      settings: [
        {
          id: 'export-midi-row',
          source: 'action',
          action: 'export-midi',
          label: 'MIDI file',
          control: { kind: 'action', actionLabel: 'Export MIDI' },
        },
        {
          id: 'export-guitar-pro-row',
          source: 'action',
          action: 'export-guitar-pro',
          label: 'Guitar Pro file',
          control: { kind: 'action', actionLabel: 'Export Guitar Pro' },
        },
      ],
    },
  ];
}

/**
 * The reverse (number → name) lookup for every enum-valued Stylesheet row, keyed by its
 * `StylesheetKey`. Built from the engine for the same reason `buildSettingGroups` is: every enum
 * here is a runtime AlphaTab value. `multiBarRests` has no entry — it is a boolean, not an enum.
 *
 * This is what the Settings popover turns into the `enumName` callback `readStylesheetValues`
 * (live-settings.ts) takes: `(key, value) => String(STYLESHEET_ENUMS(engine)[key]?.[value] ?? '')`.
 * A numeric TypeScript enum's reverse mapping is a string at runtime, so the lookup already
 * satisfies `enumName`'s `=> string` return type without a cast.
 */
export function STYLESHEET_ENUMS(
  engine: AlphaTabEngine,
): Partial<Record<StylesheetKey, Record<number, string>>> {
  return {
    bracketExtendMode: engine.model.BracketExtendMode,
    singleTrackTrackNamePolicy: engine.model.TrackNamePolicy,
    multiTrackTrackNamePolicy: engine.model.TrackNamePolicy,
    firstSystemTrackNameMode: engine.model.TrackNameMode,
    firstSystemTrackNameOrientation: engine.model.TrackNameOrientation,
    otherSystemsTrackNameMode: engine.model.TrackNameMode,
    otherSystemsTrackNameOrientation: engine.model.TrackNameOrientation,
  };
}

/**
 * The values the app ships with, for every `settings` row. This is the fallback a corrupt stored
 * value is merged against, so a key missing from it can never be restored — and it is what the
 * FIRST edit pushes into the engine, whole, so every value here must be the one the player really
 * starts with: AlphaTab's own default, or what the player's settings callback sets.
 *
 * Enums are written by NAME — see enumOptions. Every leaf here was read off a fresh
 * `new engine.Settings()` (not transcribed from documentation, which is stale in three places —
 * see settings-schema.test.ts) and is asserted against the engine's own serializer there.
 */
export const DEFAULT_PLAYER_SETTINGS: PlayerSettingsJson = {
  core: { engine: 'svg' },
  display: {
    scale: 1,
    stretchForce: 1,
    layoutMode: 'Page',
    barsPerRow: -1,
    startBar: 1,
    barCount: -1,
    justifyLastSystem: false,
    systemsLayoutMode: 'Automatic',
    // padding is an ARRAY — [horizontal, vertical] — and must stay one.
    padding: [35, 35],
    firstSystemPaddingTop: 0,
    systemPaddingTop: 10,
    lastSystemPaddingBottom: 5,
    systemPaddingBottom: 10,
    systemLabelPaddingLeft: 0,
    systemLabelPaddingRight: 3,
    accoladeBarPaddingRight: 3,
    notationStaffPaddingTop: 0,
    notationStaffPaddingBottom: 0,
    effectStaffPaddingTop: 0,
    effectStaffPaddingBottom: 0,
    firstStaffPaddingLeft: 6,
    staffPaddingLeft: 2,
    resources: {
      // Colours are the CSS string `Color#rgba` reports — a plain `#RRGGBB` hex for an opaque
      // colour, `rgba(r,g,b,a)` for one with alpha (secondaryGlyphColor). Both round-trip through
      // `Color.fromJson`, which is what a stored value is restored through.
      staffLineColor: '#A5A5A5',
      barSeparatorColor: '#222211',
      barNumberColor: '#C80000',
      mainGlyphColor: '#000000',
      secondaryGlyphColor: 'rgba(0,0,0,0.39215686274509803)',
      scoreInfoColor: '#000000',
      numberedNotationFont: '16px Arial, sans-serif',
      tablatureFont: '14px Arial, sans-serif',
      graceFont: '12px Arial, sans-serif',
      elementFonts: {
        ScoreCopyright: 'bold 12px Arial, sans-serif',
        ScoreTitle: '32px Georgia, serif',
        ScoreSubTitle: '20px Georgia, serif',
        ScoreWords: '15px Georgia, serif',
        EffectBeatTimer: '12px Georgia, serif',
        EffectDirections: '14px Georgia, serif',
        ChordDiagramFretboardNumbers: '11px Arial, sans-serif',
        EffectMarker: 'bold 14px Georgia, serif',
        BarNumber: '11px Arial, sans-serif',
      },
    },
  },
  notation: {
    fingeringMode: 'ScoreDefault',
    rhythmMode: 'Automatic',
    rhythmHeight: 25,
    smallGraceTabNotes: true,
    extendBendArrowsOnTiedNotes: true,
    extendLineEffectsToBeatEnd: false,
    slurHeight: 5,
  },
  player: {
    // All four are set by the player at construction. Only TWO of them differ from a fresh
    // Settings() — playerMode (engine default Disabled) and scrollOffsetY (engine default 0); those
    // two are the ones settings-schema.test.ts skips. enableCursor (true) and scrollMode
    // (Continuous) happen to equal the engine's own defaults and stay under the guard.
    playerMode: 'EnabledAutomatic',
    enableCursor: true,
    enableAnimatedBeatCursor: true,
    enableElementHighlighting: true,
    enableUserInteraction: true,
    scrollOffsetX: 0,
    scrollOffsetY: -10,
    scrollMode: 'Continuous',
    songBookBendDuration: 75,
    songBookDipDuration: 150,
    vibrato: {
      noteWideLength: 240,
      noteWideAmplitude: 1,
      noteSlightLength: 360,
      noteSlightAmplitude: 0.5,
      beatWideLength: 480,
      beatWideAmplitude: 2,
      beatSlightLength: 480,
      beatSlightAmplitude: 2,
    },
    slide: {
      simpleSlidePitchOffset: 6,
      simpleSlideDurationRatio: 0.25,
      shiftSlideDurationRatio: 0.5,
    },
    playTripletFeel: true,
  },
};

/**
 * Every option-bearing row's allowed VALUES, by dot-path. The settings-storage restore path gates
 * the stored document on it before the restore push: an enum name AlphaTab does not know does not
 * fail, it WIPES the key.
 *
 * A PLAIN module constant of enum NAMES as string literals — it cannot be built from
 * buildSettingGroups(engine), because PlayerShell reads it in a lazy useState initialiser on its
 * FIRST render, when the engine context is still { engine: null } (it resolves the dynamic import
 * inside an effect). Names are strings, so this touches no runtime AlphaTab value and stays inside
 * the type-imports-only fence. Drift is caught by a case in settings-schema.test.ts, not by
 * sharing the descriptors: it asserts this map equals every option list buildSettingGroups(engine)
 * produces, so a row and its option list still cannot separate.
 */
export const SETTING_OPTION_VALUES: Readonly<Record<string, readonly string[]>> = {
  'core.engine': ['svg', 'html5'],
  'display.layoutMode': ['Page', 'Horizontal', 'Parchment'],
  'display.systemsLayoutMode': ['Automatic', 'UseModelLayout'],
  'notation.fingeringMode': [
    'ScoreDefault',
    'ScoreForcePiano',
    'SingleNoteEffectBand',
    'SingleNoteEffectBandForcePiano',
  ],
  'notation.rhythmMode': ['Hidden', 'ShowWithBeams', 'ShowWithBars', 'Automatic'],
  'player.playerMode': [
    'Disabled',
    'EnabledAutomatic',
    'EnabledSynthesizer',
    'EnabledBackingTrack',
    'EnabledExternalMedia',
  ],
  'player.scrollMode': ['Off', 'Continuous', 'OffScreen', 'Smooth'],
};

/**
 * Every number and range row's declared BOUNDS, by dot-path — the same hand-maintained mirror as
 * SETTING_OPTION_VALUES above, kept honest by the same drift test, and read by the settings-storage
 * restore path before the engine exists.
 *
 * A stored number outside its row's range is not caught by anything else: the per-key merge gates
 * on `typeof` only, and the option lists gate enum NAMES. The field's own clamp runs on commit
 * (blur or Enter), so closing the tab mid-edit persists the unclamped draft and every later visit
 * restores it. Clamping here is the only place that sees it.
 *
 * The two rows with neither bound — player.scrollOffsetX/Y, which are legitimately unbounded and
 * may be negative — are deliberately absent rather than present and empty.
 */
export const SETTING_NUMERIC_BOUNDS: Readonly<
  Record<string, { readonly min?: number; readonly max?: number }>
> = {
  'player.songBookBendDuration': { min: 0 },
  'player.songBookDipDuration': { min: 0 },
  'player.vibrato.noteWideLength': { min: 0 },
  'player.vibrato.noteWideAmplitude': { min: 0 },
  'player.vibrato.noteSlightLength': { min: 0 },
  'player.vibrato.noteSlightAmplitude': { min: 0 },
  'player.vibrato.beatWideLength': { min: 0 },
  'player.vibrato.beatWideAmplitude': { min: 0 },
  'player.vibrato.beatSlightLength': { min: 0 },
  'player.vibrato.beatSlightAmplitude': { min: 0 },
  'player.slide.simpleSlidePitchOffset': { min: 0 },
  'player.slide.simpleSlideDurationRatio': { min: 0, max: 1 },
  'player.slide.shiftSlideDurationRatio': { min: 0, max: 1 },
  'display.scale': { min: 0.25, max: 3 },
  'display.stretchForce': { min: 0.1 },
  'display.barsPerRow': { min: -1 },
  'display.startBar': { min: 1 },
  'display.barCount': { min: -1 },
  'display.padding.0': { min: 0 },
  'display.padding.1': { min: 0 },
  'display.firstSystemPaddingTop': { min: 0 },
  'display.systemPaddingTop': { min: 0 },
  'display.lastSystemPaddingBottom': { min: 0 },
  'display.systemPaddingBottom': { min: 0 },
  'display.systemLabelPaddingLeft': { min: 0 },
  'display.systemLabelPaddingRight': { min: 0 },
  'display.accoladeBarPaddingRight': { min: 0 },
  'display.notationStaffPaddingTop': { min: 0 },
  'display.notationStaffPaddingBottom': { min: 0 },
  'display.effectStaffPaddingTop': { min: 0 },
  'display.effectStaffPaddingBottom': { min: 0 },
  'display.firstStaffPaddingLeft': { min: 0 },
  'display.staffPaddingLeft': { min: 0 },
  'notation.rhythmHeight': { min: 0 },
  'notation.slurHeight': { min: 0 },
};

/**
 * Every TEXT row's validator, by dot-path — the third hand-maintained mirror beside
 * SETTING_OPTION_VALUES and SETTING_NUMERIC_BOUNDS, kept honest by the same drift test, and read
 * by the settings-storage restore path before the engine exists.
 *
 * Without it the thirteen text rows are the one row kind the restore gates NOTHING on: the per-key
 * merge gates on `typeof` only, so a stored font of `bold` and a stored colour of `red` are both
 * strings and both survive it. They then reach `fillFromJson`, which has no per-key try/catch — so
 * the font THROWS and takes the whole restore with it (every unrelated notation and player group
 * included), while the colour does not throw at all and instead stores a `null` the renderer
 * dereferences a frame later, outside any catch.
 *
 * These are the SAME two functions the rows themselves use, exported rather than re-implemented, so
 * the write path and the read path cannot drift into disagreeing about what the engine accepts.
 */
export const SETTING_TEXT_VALIDATORS: Readonly<Record<string, (draft: string) => boolean>> = {
  'display.resources.secondaryGlyphColor': isCssColor,
  // The five `kind: 'color'` rows. They are gated here rather than by the row, because a colour row
  // draws with <input type="color"> and carries no validate of its own — and on the way back in a
  // row absent from this map is gated by NOTHING: the merge only compares `typeof`, the option
  // lists cover enum names and the bounds cover numbers. Color.fromJson returns null WITHOUT
  // throwing for a value outside its grammar, the engine assigns that null, and the renderer then
  // reads `.rgba` off it inside a queued frame, outside any catch.
  'display.resources.staffLineColor': isCssColor,
  'display.resources.barSeparatorColor': isCssColor,
  'display.resources.barNumberColor': isCssColor,
  'display.resources.mainGlyphColor': isCssColor,
  'display.resources.scoreInfoColor': isCssColor,
  'display.resources.elementFonts.ScoreCopyright': isFontShorthand,
  'display.resources.elementFonts.ScoreTitle': isFontShorthand,
  'display.resources.elementFonts.ScoreSubTitle': isFontShorthand,
  'display.resources.elementFonts.ScoreWords': isFontShorthand,
  'display.resources.elementFonts.EffectBeatTimer': isFontShorthand,
  'display.resources.elementFonts.EffectDirections': isFontShorthand,
  'display.resources.elementFonts.ChordDiagramFretboardNumbers': isFontShorthand,
  'display.resources.elementFonts.EffectMarker': isFontShorthand,
  'display.resources.elementFonts.BarNumber': isFontShorthand,
  'display.resources.numberedNotationFont': isFontShorthand,
  'display.resources.tablatureFont': isFontShorthand,
  'display.resources.graceFont': isFontShorthand,
};

/**
 * Every settings row's LABEL, by dot-path — the fourth hand-maintained mirror beside the option
 * values, the bounds and the validators, kept honest by the same drift test.
 *
 * The restore path needs these to say WHICH settings it repaired, and it runs in a lazy useState
 * initialiser on the first render, before the engine exists — so it cannot ask
 * buildSettingGroups(engine) for them. The labels themselves are plain strings and touch no
 * runtime AlphaTab value, so mirroring them here stays inside the type-imports-only fence.
 */
export const SETTING_LABELS: Readonly<Record<string, string>> = {
  'player.playerMode': 'Playback source',
  'player.enableCursor': 'Show the playback cursor',
  'player.enableAnimatedBeatCursor': 'Animate the beat cursor',
  'player.enableElementHighlighting': 'Highlight the note being played',
  'player.enableUserInteraction': 'Click a beat to seek there',
  'player.scrollOffsetX': 'Auto-scroll offset: horizontal',
  'player.scrollOffsetY': 'Auto-scroll offset: vertical',
  'player.scrollMode': 'Auto-scroll style',
  'player.songBookBendDuration': 'Bend duration (song-book notation)',
  'player.songBookDipDuration': 'Whammy dip duration (song-book notation)',
  'player.vibrato.noteWideLength': 'Wide note vibrato: length',
  'player.vibrato.noteWideAmplitude': 'Wide note vibrato: amplitude',
  'player.vibrato.noteSlightLength': 'Slight note vibrato: length',
  'player.vibrato.noteSlightAmplitude': 'Slight note vibrato: amplitude',
  'player.vibrato.beatWideLength': 'Wide beat vibrato: length',
  'player.vibrato.beatWideAmplitude': 'Wide beat vibrato: amplitude',
  'player.vibrato.beatSlightLength': 'Slight beat vibrato: length',
  'player.vibrato.beatSlightAmplitude': 'Slight beat vibrato: amplitude',
  'player.slide.simpleSlidePitchOffset': 'Simple slide: pitch offset',
  'player.slide.simpleSlideDurationRatio': 'Simple slide: duration',
  'player.slide.shiftSlideDurationRatio': 'Shift and legato slide: duration',
  'player.playTripletFeel': 'Play the triplet feel',
  'core.engine': 'Renderer',
  'display.scale': 'Zoom',
  'display.stretchForce': 'Note spacing',
  'display.layoutMode': 'Layout',
  'display.barsPerRow': 'Bars per row (-1 = automatic)',
  'display.startBar': 'Start at bar',
  'display.barCount': 'Bars to display (-1 = all)',
  'display.justifyLastSystem': 'Justify the last row',
  'display.systemsLayoutMode': 'Row layout source',
  'display.resources.staffLineColor': 'Staff lines',
  'display.resources.barSeparatorColor': 'Bar separators',
  'display.resources.barNumberColor': 'Bar numbers',
  'display.resources.mainGlyphColor': 'Primary voice',
  'display.resources.secondaryGlyphColor': 'Secondary voices',
  'display.resources.scoreInfoColor': 'Song info',
  'display.resources.elementFonts.ScoreCopyright': 'Copyright line',
  'display.resources.elementFonts.ScoreTitle': 'Title',
  'display.resources.elementFonts.ScoreSubTitle': 'Subtitle',
  'display.resources.elementFonts.ScoreWords': 'Lyrics',
  'display.resources.elementFonts.EffectBeatTimer': 'Beat timer',
  'display.resources.elementFonts.EffectDirections': 'Directions text',
  'display.resources.elementFonts.ChordDiagramFretboardNumbers': 'Chord diagram fret numbers',
  'display.resources.elementFonts.EffectMarker': 'Section markers',
  'display.resources.elementFonts.BarNumber': 'Bar numbers',
  'display.resources.numberedNotationFont': 'Numbered notation',
  'display.resources.tablatureFont': 'Tablature numbers',
  'display.resources.graceFont': 'Grace notes',
  'display.padding.0': 'Padding: left and right',
  'display.padding.1': 'Padding: top and bottom',
  'display.firstSystemPaddingTop': 'First row: top padding',
  'display.systemPaddingTop': 'Row: top padding',
  'display.lastSystemPaddingBottom': 'Last row: bottom padding',
  'display.systemPaddingBottom': 'Row: bottom padding',
  'display.systemLabelPaddingLeft': 'Track name: left padding',
  'display.systemLabelPaddingRight': 'Track name: right padding',
  'display.accoladeBarPaddingRight': 'Brace: right padding',
  'display.notationStaffPaddingTop': 'Notation staff: top padding',
  'display.notationStaffPaddingBottom': 'Notation staff: bottom padding',
  'display.effectStaffPaddingTop': 'Effect band: top padding',
  'display.effectStaffPaddingBottom': 'Effect band: bottom padding',
  'display.firstStaffPaddingLeft': 'First staff: left padding',
  'display.staffPaddingLeft': 'Staff: left padding',
  'notation.fingeringMode': 'Fingering display',
  'notation.rhythmMode': 'Tab rhythm notation',
  'notation.rhythmHeight': 'Tab rhythm notation height',
  'notation.smallGraceTabNotes': 'Small grace notes on tab',
  'notation.extendBendArrowsOnTiedNotes': 'Extend bend arrows across tied notes',
  'notation.extendLineEffectsToBeatEnd': "Extend line effects to the beat's end",
  'notation.slurHeight': 'Slur height',
};
