import { describe, expect, it } from 'vitest';

import { loadStoredSettings, serializeSettings } from './settings-storage';

const DEFAULTS = { display: { scale: 1 }, player: { enableCursor: true } };
// Every option-bearing row's allowed VALUES, by dot-path — what the schema offers.
const OPTIONS = { 'display.layoutMode': ['Page', 'Horizontal'] } as const;
// Every number/range row's declared min/max, by dot-path — what the schema's controls declare.
const BOUNDS = { 'display.scale': { min: 0.25, max: 3 } } as const;

describe('loadStoredSettings', () => {
  it('round-trips every stored value', () => {
    const stored = serializeSettings({ display: { scale: 1.4 }, player: { enableCursor: false } });
    const { settings, reset } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS);

    expect(settings).toEqual({ display: { scale: 1.4 }, player: { enableCursor: false } });
    expect(reset).toBe(false);
  });

  it('yields the defaults for a first visit, and does NOT call that a reset', () => {
    const { settings, reset } = loadStoredSettings(null, DEFAULTS, OPTIONS, BOUNDS);
    expect(settings).toEqual(DEFAULTS);
    // A first visit is not a corruption.
    expect(reset).toBe(false);
  });

  // A bad stored value must never break the player, and must not vanish quietly.
  it('falls back to the defaults and reports a reset on unparseable JSON', () => {
    const { settings, reset } = loadStoredSettings('{not json', DEFAULTS, OPTIONS, BOUNDS);
    expect(settings).toEqual(DEFAULTS);
    expect(reset).toBe(true);
  });

  it('falls back and reports a reset on a wrong-shaped value', () => {
    const { settings, reset } = loadStoredSettings('"a string"', DEFAULTS, OPTIONS, BOUNDS);
    expect(settings).toEqual(DEFAULTS);
    expect(reset).toBe(true);
  });

  // Merge PER KEY rather than discarding the whole object — the settings search layers over
  // these same settings, so the stored shape changes soon after v0 ships.
  it('keeps the keys an older version has and fills the rest from the defaults', () => {
    const stored = JSON.stringify({ version: 0, settings: { display: { scale: 1.4 } } });
    const { settings, reset } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS);

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
    const { settings, reset } = loadStoredSettings(stored, defaults, OPTIONS, BOUNDS);

    expect(settings).toEqual({ display: { layoutMode: 'Page' } });
    // A typo in storage is a corruption the person should be told about.
    expect(reset).toBe(true);
  });

  it('drops a key the defaults do not declare', () => {
    const stored = JSON.stringify({
      version: 1,
      settings: { display: { scale: 1.4 }, bogus: { nope: 1 } },
    });
    const { settings } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS);
    expect(settings).not.toHaveProperty('bogus');
  });

  // display.padding is an array. It must come back as one, element by element, and a stored
  // array of the wrong length or with a non-number in it is dropped whole.
  it('merges an array element by element, and drops a malformed one', () => {
    const defaults = { display: { padding: [35, 35] } };
    const good = JSON.stringify({ version: 1, settings: { display: { padding: [10, 20] } } });
    expect(loadStoredSettings(good, defaults, OPTIONS, BOUNDS).settings).toEqual({
      display: { padding: [10, 20] },
    });

    for (const bad of [[10], [10, 'wide'], { 0: 10, 1: 20 }, null]) {
      const stored = JSON.stringify({ version: 1, settings: { display: { padding: bad } } });
      expect(loadStoredSettings(stored, defaults, OPTIONS, BOUNDS).settings).toEqual(defaults);
    }
  });

  // A stored value of the wrong TYPE would reach fillFromJson as-is. A string where a number
  // belongs breaks the layout without throwing, so the default wins.
  it('drops a stored value whose type differs from the default', () => {
    const stored = JSON.stringify({ version: 1, settings: { display: { scale: 'huge' } } });
    const { settings } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS);
    expect(settings).toEqual(DEFAULTS);
  });

  it('clamps a stored number back inside its row range, and calls that a reset', () => {
    // The field clamps on blur/Enter only, so a tab closed mid-edit persists the raw draft. This
    // is the only place that sees it on the way back in.
    const stored = serializeSettings({ display: { scale: 9 }, player: { enableCursor: true } });
    const { settings, reset } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS);

    expect(settings).toEqual({ display: { scale: 3 }, player: { enableCursor: true } });
    expect(reset).toBe(true);
  });

  it('clamps up to the minimum as well as down to the maximum', () => {
    const stored = serializeSettings({ display: { scale: -5 }, player: { enableCursor: true } });
    const { settings, reset } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS);

    expect(settings).toEqual({ display: { scale: 0.25 }, player: { enableCursor: true } });
    expect(reset).toBe(true);
  });

  it('leaves an in-range number alone and does NOT call that a reset', () => {
    const stored = serializeSettings({ display: { scale: 1.4 }, player: { enableCursor: true } });
    const { settings, reset } = loadStoredSettings(stored, DEFAULTS, OPTIONS, BOUNDS);

    expect(settings).toEqual({ display: { scale: 1.4 }, player: { enableCursor: true } });
    expect(reset).toBe(false);
  });
});
