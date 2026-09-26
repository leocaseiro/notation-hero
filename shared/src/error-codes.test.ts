import { describe, expect, it } from 'vitest';

import { ERROR, RETIRED_ERROR_CODES } from './error-codes';

const codes = Object.values(ERROR);

// The ranges the registry reserves. A number outside them means either a new area arrived without
// a range, or a typo put a code somewhere nobody is looking for it.
const DECLARED_RANGE_PREFIXES = new Set(['1', '2', '3', '5', '9']);

describe('the error-code registry', () => {
  it('gives every code the E-plus-three-digits shape', () => {
    for (const code of codes) expect(code).toMatch(/^E\d{3}$/);
  });

  it('never uses one number twice', () => {
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('never lists a live code as retired', () => {
    const retired = new Set<string>(RETIRED_ERROR_CODES);
    expect(codes.filter((code) => retired.has(code))).toEqual([]);
  });

  // The whole point of moving this registry was that the numbers already in the wild keep meaning
  // what they meant. `web/e2e/player.e2e.ts` asserts four of these strings against the rendered
  // page, so a renumber here would surface as an e2e failure — this test names it at the source.
  it('keeps every pre-existing player code at its historical number', () => {
    expect(ERROR.fileTooLarge).toBe('E101');
    expect(ERROR.fileUnreadable).toBe('E102');
    expect(ERROR.notAScore).toBe('E103');
    expect(ERROR.cachedScoreUnavailable).toBe('E104');
    expect(ERROR.engineImport).toBe('E201');
    expect(ERROR.engineRuntime).toBe('E202');
    expect(ERROR.musicFontFailed).toBe('E203');
    expect(ERROR.musicFontTimeout).toBe('E204');
    expect(ERROR.unexpectedCrash).toBe('E901');
  });

  it('puts every code inside a declared range', () => {
    const stray = codes.filter((code) => !DECLARED_RANGE_PREFIXES.has(code[1] ?? ''));
    expect(stray).toEqual([]);
  });
});
