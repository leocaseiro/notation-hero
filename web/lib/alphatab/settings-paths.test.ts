import { describe, expect, it } from 'vitest';

import { readSettingValue, writeSettingValue } from './settings-paths';

describe('readSettingValue', () => {
  it('reads a nested value by dot path', () => {
    expect(readSettingValue({ display: { scale: 1.4 } }, 'display.scale')).toBeCloseTo(1.4);
  });

  it('returns undefined for a missing path instead of throwing', () => {
    expect(readSettingValue({}, 'display.scale')).toBeUndefined();
    expect(readSettingValue({ display: {} }, 'display.resources.staffLineColor')).toBeUndefined();
  });
});

describe('writeSettingValue', () => {
  it('writes a nested value without mutating the input', () => {
    const before = { display: { scale: 1 } };
    const after = writeSettingValue(before, 'display.scale', 2);

    expect(readSettingValue(after, 'display.scale')).toBe(2);
    // The original must not be mutated: React state holds it.
    expect(before.display.scale).toBe(1);
  });

  it('creates missing intermediate objects', () => {
    const after = writeSettingValue({}, 'display.resources.staffLineColor', '#2DD4BF');
    expect(readSettingValue(after, 'display.resources.staffLineColor')).toBe('#2DD4BF');
  });

  it('leaves sibling keys intact', () => {
    const after = writeSettingValue({ display: { scale: 1, stretchForce: 1 } }, 'display.scale', 2);
    expect(readSettingValue(after, 'display.stretchForce')).toBe(1);
  });

  // display.padding is [horizontal, vertical]. Spreading an array into an object literal yields
  // { 0: …, 1: … }, which fillFromJson does not read as a padding at all.
  it('reads and writes an array element, and the array stays an array', () => {
    const before = { display: { padding: [35, 35] } };
    expect(readSettingValue(before, 'display.padding.1')).toBe(35);

    const after = writeSettingValue(before, 'display.padding.1', 10);
    expect((after.display as { padding: unknown }).padding).toEqual([35, 10]);
    expect(before.display.padding).toEqual([35, 35]);
  });
});
