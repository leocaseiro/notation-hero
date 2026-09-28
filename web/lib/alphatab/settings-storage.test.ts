import { describe, expect, it } from 'vitest';

import { loadStoredSettings, serializeSettings } from './settings-storage';

const DEFAULTS = { display: { scale: 1 }, player: { enableCursor: true } };
// Every option-bearing row's allowed VALUES, by dot-path — what the schema offers.
const OPTIONS = { 'display.layoutMode': ['Page', 'Horizontal'] } as const;
// Every number/range row's declared min/max, by dot-path — what the schema's controls declare.
const BOUNDS = { 'display.scale': { min: 0.25, max: 3 } } as const;
// Every text row's own validator, by dot-path. Stands in for the real font/colour validators: what
// matters here is that the restore CONSULTS them, not which grammar they encode.
const TEXTS = { 'display.font': (draft: string) => draft.startsWith('12px ') } as const;

const byPath = (a: string, b: string): number => a.localeCompare(b);

describe('loadStoredSettings', () => {
  it('round-trips every stored value', () => {
    const stored = serializeSettings({ display: { scale: 1.4 }, player: { enableCursor: false } });
    const { settings, reset } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS, TEXTS);

    expect(settings).toEqual({ display: { scale: 1.4 }, player: { enableCursor: false } });
    expect(reset).toBe(false);
  });

  it('yields the defaults for a first visit, and does NOT call that a reset', () => {
    const { settings, reset } = loadStoredSettings(null, DEFAULTS, OPTIONS, BOUNDS, TEXTS);
    expect(settings).toEqual(DEFAULTS);
    // A first visit is not a corruption.
    expect(reset).toBe(false);
  });

  // A bad stored value must never break the player, and must not vanish quietly.
  it('falls back to the defaults and reports a reset on unparseable JSON', () => {
    const { settings, reset } = loadStoredSettings('{not json', DEFAULTS, OPTIONS, BOUNDS, TEXTS);
    expect(settings).toEqual(DEFAULTS);
    expect(reset).toBe(true);
  });

  it('falls back and reports a reset on a wrong-shaped value', () => {
    const { settings, reset } = loadStoredSettings('"a string"', DEFAULTS, OPTIONS, BOUNDS, TEXTS);
    expect(settings).toEqual(DEFAULTS);
    expect(reset).toBe(true);
  });

  // Merge PER KEY rather than discarding the whole object — the settings search layers over
  // these same settings, so the stored shape changes soon after v0 ships.
  it('keeps the keys an older version has and fills the rest from the defaults', () => {
    const stored = JSON.stringify({ version: 0, settings: { display: { scale: 1.4 } } });
    const { settings, reset } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS, TEXTS);

    expect(settings).toEqual({ display: { scale: 1.4 }, player: { enableCursor: true } });
    // A partial merge is not a reset.
    expect(reset).toBe(false);
  });

  // A stored enum NAME the engine does not know is not inert: fillFromJson assigns parseEnum's
  // `undefined` straight through and reports success, so the good value is gone and stays gone for
  // the session. The same-type check cannot see it: a name the engine knows and one it does not
  // are both strings. The measured case was `Horizontal` with a letter dropped.
  it('drops an option value the row does not offer, back to its default', () => {
    const defaults = { display: { layoutMode: 'Page' } };
    const stored = JSON.stringify({
      version: 1,
      settings: { display: { layoutMode: 'NotAMode' } },
    });
    const { settings, reset } = loadStoredSettings(stored, defaults, OPTIONS, BOUNDS, TEXTS);

    expect(settings).toEqual({ display: { layoutMode: 'Page' } });
    // A typo in storage is a corruption the person should be told about.
    expect(reset).toBe(true);
  });

  it('drops a key the defaults do not declare', () => {
    const stored = JSON.stringify({
      version: 1,
      settings: { display: { scale: 1.4 }, bogus: { nope: 1 } },
    });
    const { settings } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS, TEXTS);
    expect(settings).not.toHaveProperty('bogus');
  });

  // display.padding is an array. It must come back as one, element by element, and a stored
  // array of the wrong length or with a non-number in it is dropped whole.
  it('merges an array element by element, and drops a malformed one', () => {
    const defaults = { display: { padding: [35, 35] } };
    const good = JSON.stringify({ version: 1, settings: { display: { padding: [10, 20] } } });
    expect(loadStoredSettings(good, defaults, OPTIONS, BOUNDS, TEXTS).settings).toEqual({
      display: { padding: [10, 20] },
    });

    for (const bad of [[10], [10, 'wide'], { 0: 10, 1: 20 }, null]) {
      const stored = JSON.stringify({ version: 1, settings: { display: { padding: bad } } });
      expect(loadStoredSettings(stored, defaults, OPTIONS, BOUNDS, TEXTS).settings).toEqual(
        defaults,
      );
    }
  });

  // A stored value of the wrong TYPE would reach fillFromJson as-is. A string where a number
  // belongs breaks the layout without throwing, so the default wins.
  it('drops a stored value whose type differs from the default', () => {
    const stored = JSON.stringify({ version: 1, settings: { display: { scale: 'huge' } } });
    const { settings } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS, TEXTS);
    expect(settings).toEqual(DEFAULTS);
  });

  it('clamps a stored number back inside its row range, and calls that a reset', () => {
    // The field clamps on blur/Enter only, so a tab closed mid-edit persists the raw draft. This
    // is the only place that sees it on the way back in.
    const stored = serializeSettings({ display: { scale: 9 }, player: { enableCursor: true } });
    const { settings, reset } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS, TEXTS);

    expect(settings).toEqual({ display: { scale: 3 }, player: { enableCursor: true } });
    expect(reset).toBe(true);
  });

  it('clamps up to the minimum as well as down to the maximum', () => {
    const stored = serializeSettings({ display: { scale: -5 }, player: { enableCursor: true } });
    const { settings, reset } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS, TEXTS);

    expect(settings).toEqual({ display: { scale: 0.25 }, player: { enableCursor: true } });
    expect(reset).toBe(true);
  });

  it('leaves an in-range number alone and does NOT call that a reset', () => {
    const stored = serializeSettings({ display: { scale: 1.4 }, player: { enableCursor: true } });
    const { settings, reset } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS, TEXTS);

    expect(settings).toEqual({ display: { scale: 1.4 }, player: { enableCursor: true } });
    expect(reset).toBe(false);
  });

  // A text row is a string whatever it holds, so nothing upstream of this catches a bad one: the
  // per-key merge gates on `typeof`, the option lists gate enum names, the bounds gate numbers.
  it('restores the default for a text value its row rejects, and calls that a reset', () => {
    const defaults = { display: { font: '12px serif', scale: 1 } };
    const stored = serializeSettings({ display: { font: 'bold', scale: 1 } });
    const { settings, reset } = loadStoredSettings(stored, defaults, OPTIONS, BOUNDS, TEXTS);

    expect(settings).toEqual({ display: { font: '12px serif', scale: 1 } });
    expect(reset).toBe(true);
  });

  // The whole point of repairing per key: one bad font used to throw inside fillFromJson and take
  // every unrelated group with it.
  it('keeps every OTHER stored value when one text row is corrupt', () => {
    const defaults = { display: { font: '12px serif', scale: 1 }, player: { enableCursor: true } };
    const stored = serializeSettings({
      display: { font: '<image onerror=alert(1)>', scale: 2 },
      player: { enableCursor: false },
    });
    const { settings, reset } = loadStoredSettings(stored, defaults, OPTIONS, BOUNDS, TEXTS);

    expect(settings).toEqual({
      display: { font: '12px serif', scale: 2 },
      player: { enableCursor: false },
    });
    expect(reset).toBe(true);
  });

  it('leaves a valid text value alone and does NOT call that a reset', () => {
    const defaults = { display: { font: '12px serif', scale: 1 } };
    const stored = serializeSettings({ display: { font: '12px "Times New Roman"', scale: 1 } });
    const { settings, reset } = loadStoredSettings(stored, defaults, OPTIONS, BOUNDS, TEXTS);

    expect(settings).toEqual({ display: { font: '12px "Times New Roman"', scale: 1 } });
    expect(reset).toBe(false);
  });

  // The warning names the rows it repaired, so the repair passes have to report WHICH paths they
  // touched, not just that something happened.
  it('reports every repaired path, from all three repair passes at once', () => {
    const defaults = { display: { font: '12px serif', scale: 1 }, player: { enableCursor: true } };
    const stored = serializeSettings({
      display: { font: 'bold', scale: 99 },
      player: { enableCursor: true },
    });
    const { reset, repaired } = loadStoredSettings(stored, defaults, OPTIONS, BOUNDS, TEXTS);

    expect(reset).toBe(true);
    expect(repaired.toSorted(byPath)).toEqual(['display.font', 'display.scale']);
  });

  it('reports no repaired paths when nothing was wrong', () => {
    const stored = serializeSettings({ display: { scale: 1.4 }, player: { enableCursor: true } });
    const { reset, repaired } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS, TEXTS);

    expect(reset).toBe(false);
    expect(repaired).toEqual([]);
  });

  // A stored NON-string where a text row belongs never reaches the validator: the per-key merge
  // compares against the default's type first and drops it there, quietly — the same way it
  // already drops a non-number, and deliberately not a "reset" (an older shape is not corruption).
  // The `typeof` guard inside dropInvalidText is therefore narrowing for the type-checker, not a
  // second line of defence; this case pins the division of labour so a future change to either
  // side cannot quietly move it.
  it('leaves a non-string text value to the merge, which drops it without a reset', () => {
    const defaults = { display: { font: '12px serif', scale: 1 } };
    const { settings, reset } = loadStoredSettings(
      JSON.stringify({ settings: { display: { font: 42, scale: 1 } } }),
      defaults,
      OPTIONS,
      BOUNDS,
      TEXTS,
    );

    expect(settings).toEqual({ display: { font: '12px serif', scale: 1 } });
    expect(reset).toBe(false);
  });
});
