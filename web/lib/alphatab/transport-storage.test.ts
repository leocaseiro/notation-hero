import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TRANSPORT_VALUES,
  loadStoredTransport,
  serializeTransport,
} from './transport-storage';

const ON = { metronomeVolume: 1, countInVolume: 0.5, masterVolume: 0.8, isLooping: true };

describe('loadStoredTransport', () => {
  it('round-trips every stored value', () => {
    expect(loadStoredTransport(serializeTransport(ON))).toEqual(ON);
  });

  it('yields the defaults for a first visit', () => {
    expect(loadStoredTransport(null)).toEqual(DEFAULT_TRANSPORT_VALUES);
  });

  // A bad stored value must never break the transport.
  it('falls back to the defaults on unparseable JSON', () => {
    expect(loadStoredTransport('{not json')).toEqual(DEFAULT_TRANSPORT_VALUES);
  });

  it('falls back to the defaults on a wrong-shaped document', () => {
    expect(loadStoredTransport('"a string"')).toEqual(DEFAULT_TRANSPORT_VALUES);
    expect(loadStoredTransport(JSON.stringify({ version: 1 }))).toEqual(DEFAULT_TRANSPORT_VALUES);
    expect(loadStoredTransport(JSON.stringify({ version: 1, settings: 7 }))).toEqual(
      DEFAULT_TRANSPORT_VALUES,
    );
  });

  it('backfills a key an older stored shape does not carry yet', () => {
    const older = JSON.stringify({ version: 1, settings: { isLooping: true } });
    expect(loadStoredTransport(older)).toEqual({ ...DEFAULT_TRANSPORT_VALUES, isLooping: true });
  });

  // Clamping rather than discarding keeps the intent of what was set.
  it('clamps a volume to the 0-1 range its row declares', () => {
    const stored = JSON.stringify({
      version: 1,
      settings: { metronomeVolume: 9, countInVolume: -5, masterVolume: 0.25, isLooping: false },
    });
    expect(loadStoredTransport(stored)).toEqual({
      metronomeVolume: 1,
      countInVolume: 0,
      masterVolume: 0.25,
      isLooping: false,
    });
  });

  // `1e999` parses to Infinity, which compares false against every bound and would otherwise pass
  // straight through. The shared reader pins a non-finite number to its row's MINIMUM, so a
  // corrupt master volume lands on 0 rather than on the shipped 1. Asserted rather than worked
  // around: one copy of that rule, shared with every settings row, beats a second tailored one.
  it('pins a non-finite volume to the bottom of its range', () => {
    const stored = '{"version":1,"settings":{"masterVolume":1e999,"metronomeVolume":1e999}}';
    const loaded = loadStoredTransport(stored);
    expect(loaded.masterVolume).toBe(0);
    expect(loaded.metronomeVolume).toBe(0);
  });

  it('keeps the other values when one of them is corrupt', () => {
    const stored = JSON.stringify({
      version: 1,
      settings: { metronomeVolume: 'loud', countInVolume: 1, masterVolume: 0.5, isLooping: true },
    });
    expect(loadStoredTransport(stored)).toEqual({
      metronomeVolume: DEFAULT_TRANSPORT_VALUES.metronomeVolume,
      countInVolume: 1,
      masterVolume: 0.5,
      isLooping: true,
    });
  });

  it('rejects a non-boolean isLooping', () => {
    const stored = JSON.stringify({ version: 1, settings: { isLooping: 'yes' } });
    expect(loadStoredTransport(stored).isLooping).toBe(false);
  });
});

describe('serializeTransport', () => {
  it('carries a version integer, so a later shape change can migrate rather than discard', () => {
    expect(JSON.parse(serializeTransport(ON))).toEqual({ version: 1, settings: ON });
  });

  // The decision this file exists to hold: speed is per-passage, not per session (NH-295).
  it('does NOT persist the playback speed', () => {
    expect(serializeTransport(ON)).not.toContain('playbackSpeed');
    expect(Object.keys(DEFAULT_TRANSPORT_VALUES)).not.toContain('playbackSpeed');
  });
});
