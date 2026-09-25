import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applySettingsJson,
  clearTrackTranspositions,
  readStylesheetValues,
  setStylesheetValue,
} from './live-settings';
import { setTrackTransposition } from './live-settings';
import type { StylesheetKey } from './settings-schema';
import type * as AlphaTab from '@coderline/alphatab';

/**
 * Minimal AlphaTabApi stand-in: only the members live-settings.ts actually touches. Cast to the
 * real type at each call site — this file has no runtime AlphaTab, by design (see live-settings.ts).
 */
function createFakeApi() {
  return {
    settings: {
      fillFromJson: vi.fn(),
      notation: { transpositionPitches: [] as number[] },
    },
    updateSettings: vi.fn(),
    render: vi.fn(),
    loadMidiForScore: vi.fn(),
    score: undefined as unknown,
  };
}

/** A stylesheet with one value of each field readStylesheetValues/setStylesheetValue touch. */
function createFakeScore() {
  return {
    stylesheet: {
      hideDynamics: false,
      bracketExtendMode: 1,
      useSystemSignSeparator: false,
      globalDisplayTuning: true,
      globalDisplayChordDiagramsOnTop: true,
      singleTrackTrackNamePolicy: 1,
      multiTrackTrackNamePolicy: 1,
      firstSystemTrackNameMode: 1,
      firstSystemTrackNameOrientation: 1,
      otherSystemsTrackNameMode: 1,
      otherSystemsTrackNameOrientation: 1,
      multiTrackMultiBarRest: false,
      perTrackMultiBarRest: null as Set<number> | null,
    },
    tracks: [{ index: 0 }, { index: 1 }],
  };
}

// A stub is enough here: the round trip only needs SOME string back, not a real reverse enum
// lookup — building that map from the live enum objects is the Settings popover's job, not this
// file's (see settings-schema.ts's STYLESHEET_ENUMS).
const stubEnumName = (_key: StylesheetKey, value: number) => String(value);

// live-settings.ts calls the bare global requestAnimationFrame, which does not exist in web/'s
// node test environment (no DOM). Stubbed per test so the queued-frame assertions are exact.
let rafSpy: ReturnType<typeof vi.fn>;
let frameCallback: FrameRequestCallback | undefined;

beforeEach(() => {
  frameCallback = undefined;
  rafSpy = vi.fn((cb: FrameRequestCallback) => {
    frameCallback = cb;
    return 0;
  });
  vi.stubGlobal('requestAnimationFrame', rafSpy);
});

afterEach(() => {
  // The module's `renderQueued` flag is module state, not test state: a test that queues a frame
  // and never runs it would leave the NEXT test's coalescing count wrong. Run anything left queued.
  frameCallback?.(0);
  vi.unstubAllGlobals();
});

describe('applySettingsJson — coalescing', () => {
  it('three synchronous render pushes call updateSettings three times but queue one frame', () => {
    const api = createFakeApi();
    const alphaTabApi = api as unknown as AlphaTab.AlphaTabApi;

    applySettingsJson(alphaTabApi, { display: { scale: 1 } }, 'render');
    applySettingsJson(alphaTabApi, { display: { scale: 1.1 } }, 'render');
    applySettingsJson(alphaTabApi, { display: { scale: 1.2 } }, 'render');

    expect(api.updateSettings).toHaveBeenCalledTimes(3);
    expect(rafSpy).toHaveBeenCalledTimes(1);
    expect(api.render).not.toHaveBeenCalled();

    frameCallback?.(0);
    expect(api.render).toHaveBeenCalledTimes(1);
  });
});

describe('applySettingsJson — push modes', () => {
  it("a 'settings' apply pushes settings and queues no frame", () => {
    const api = createFakeApi();
    applySettingsJson(api as unknown as AlphaTab.AlphaTabApi, {}, 'settings');

    expect(api.updateSettings).toHaveBeenCalledTimes(1);
    expect(rafSpy).not.toHaveBeenCalled();
    expect(api.render).not.toHaveBeenCalled();
  });

  it("a 'midi' apply reloads the MIDI and calls neither updateSettings nor render", () => {
    const api = createFakeApi();
    applySettingsJson(api as unknown as AlphaTab.AlphaTabApi, {}, 'midi');

    expect(api.loadMidiForScore).toHaveBeenCalledTimes(1);
    expect(api.updateSettings).not.toHaveBeenCalled();
    expect(rafSpy).not.toHaveBeenCalled();
    expect(api.render).not.toHaveBeenCalled();
  });
});

describe('stylesheet round-trip', () => {
  it('readStylesheetValues then setStylesheetValue returns the score to its starting values', () => {
    const score = createFakeScore();
    const api = { ...createFakeApi(), score };
    const alphaTabApi = api as unknown as AlphaTab.AlphaTabApi;

    const before = readStylesheetValues(score as unknown as AlphaTab.model.Score, stubEnumName);

    setStylesheetValue(alphaTabApi, 'hideDynamics', true);
    expect(score.stylesheet.hideDynamics).toBe(true);

    setStylesheetValue(alphaTabApi, 'hideDynamics', Boolean(before.hideDynamics));
    expect(score.stylesheet.hideDynamics).toBe(before.hideDynamics);
  });

  it('the multiBarRests composite sets perTrackMultiBarRest to every track index, and to null when off', () => {
    const score = createFakeScore();
    const api = { ...createFakeApi(), score };
    const alphaTabApi = api as unknown as AlphaTab.AlphaTabApi;

    setStylesheetValue(alphaTabApi, 'multiBarRests', true);
    expect(score.stylesheet.multiTrackMultiBarRest).toBe(true);
    expect(score.stylesheet.perTrackMultiBarRest).toEqual(new Set([0, 1]));

    setStylesheetValue(alphaTabApi, 'multiBarRests', false);
    expect(score.stylesheet.multiTrackMultiBarRest).toBe(false);
    expect(score.stylesheet.perTrackMultiBarRest).toBeNull();
  });
});

/**
 * A score whose staves carry their own transposition, the way a chart with `\transpose` does.
 * The engine stores the NEGATED value on the staff, so a track written as -2 in the pitches array
 * reads back as 2 here.
 */
function createTransposingScore() {
  return {
    tracks: [
      { index: 0, staves: [{ transpositionPitch: 0 }] },
      { index: 1, staves: [{ transpositionPitch: 2 }] },
      { index: 2, staves: [{ transpositionPitch: 0 }] },
    ],
  };
}

describe('per-track transposition', () => {
  it('leaves NO holes when a track other than the first is transposed', () => {
    // The regression this pins: assigning straight into an empty array left indexes 0..n-1 as
    // holes, and the engine's guard is `i < transpositionPitches.length`, not a presence test — so
    // every lower staff read `-undefined` (NaN) and drew garbage, with synth voices keyed NaN that
    // noteOff can never match. Asserted with `in`, because [ , , 3 ] and [0, 0, 3] are both length 3.
    const api = createFakeApi();
    api.score = createTransposingScore();

    setTrackTransposition(api as unknown as AlphaTab.AlphaTabApi, 2, 3);

    const pitches = api.settings.notation.transpositionPitches;
    expect(pitches).toHaveLength(3);
    for (const index of pitches.keys()) {
      expect(index in pitches, `index ${index} is a hole`).toBe(true);
      expect(Number.isNaN(pitches[index]), `index ${index} is NaN`).toBe(false);
    }
  });

  it("fills the gap with each track's OWN transposition, not zero", () => {
    // 0 is not "leave it alone" here: it would erase a transposition the FILE carries, which
    // clearTrackTranspositions goes out of its way to preserve.
    const api = createFakeApi();
    api.score = createTransposingScore();

    setTrackTransposition(api as unknown as AlphaTab.AlphaTabApi, 2, 3);

    expect(api.settings.notation.transpositionPitches).toEqual([0, -2, 3]);
  });

  it('writes the first track without inventing any other entry', () => {
    const api = createFakeApi();
    api.score = createTransposingScore();

    setTrackTransposition(api as unknown as AlphaTab.AlphaTabApi, 0, -5);

    expect(api.settings.notation.transpositionPitches).toEqual([-5]);
  });

  it('pushes a RENDER, never a MIDI reload — it moves the notation, not the sound', () => {
    // The slider is labelled "Transpose notation" for exactly this reason. If this ever becomes a
    // 'midi' push, the label and this test have to change together.
    const api = createFakeApi();
    api.score = createTransposingScore();

    setTrackTransposition(api as unknown as AlphaTab.AlphaTabApi, 1, 4);

    expect(api.updateSettings).toHaveBeenCalledTimes(1);
    expect(api.loadMidiForScore).not.toHaveBeenCalled();
    expect(rafSpy).toHaveBeenCalledTimes(1);
  });

  it('clears every transposition and pushes settings, with no redraw', () => {
    const api = createFakeApi();
    api.score = createTransposingScore();
    setTrackTransposition(api as unknown as AlphaTab.AlphaTabApi, 1, 4);
    api.updateSettings.mockClear();
    rafSpy.mockClear();

    clearTrackTranspositions(api as unknown as AlphaTab.AlphaTabApi);

    expect(api.settings.notation.transpositionPitches).toEqual([]);
    expect(api.updateSettings).toHaveBeenCalledTimes(1);
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it('does nothing at all when there is no transposition to clear', () => {
    const api = createFakeApi();

    clearTrackTranspositions(api as unknown as AlphaTab.AlphaTabApi);

    expect(api.updateSettings).not.toHaveBeenCalled();
  });
});
