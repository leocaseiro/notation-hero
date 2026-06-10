import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ok, err } from '../Result.ts';
import type { Result } from '../Result.ts';

describe('Result kernel', () => {
  describe('ok()', () => {
    test('wraps a value in the success shape', () => {
      const result = ok(42);
      assert.equal(result.ok, true);
      // `ok: true` narrows the union to the success arm, exposing `.value`.
      assert.equal(result.value, 42);
    });

    test('preserves the wrapped value by reference', () => {
      const payload = { id: 'song-1', plays: 3 };
      const result = ok(payload);
      assert.equal(result.ok, true);
      assert.equal(result.value, payload);
    });

    test('does not carry an error field on the success arm', () => {
      const result = ok('done');
      assert.equal('error' in result, false);
    });
  });

  describe('err()', () => {
    test('wraps an error in the failure shape', () => {
      const result = err('boom');
      assert.equal(result.ok, false);
      // `ok: false` narrows the union to the failure arm, exposing `.error`.
      assert.equal(result.error, 'boom');
    });

    test('preserves a structured error object', () => {
      const failure = { code: 'ItemNotFound', id: 'song-9' };
      const result = err(failure);
      assert.equal(result.ok, false);
      assert.equal(result.error, failure);
    });

    test('does not carry a value field on the failure arm', () => {
      const result = err(new Error('nope'));
      assert.equal('value' in result, false);
    });
  });

  describe('discriminated-union narrowing', () => {
    // A function returning a real Result<T, E> — exercises both arms and
    // proves the `ok` discriminant narrows `.value` / `.error` correctly.
    const parsePositive = (n: number): Result<number, string> =>
      n > 0 ? ok(n) : err('must be positive');

    test('narrows to value on the success branch', () => {
      const result = parsePositive(5);
      if (result.ok) {
        assert.equal(result.value, 5);
      } else {
        assert.fail('expected success arm');
      }
    });

    test('narrows to error on the failure branch', () => {
      const result = parsePositive(-1);
      if (!result.ok) {
        assert.equal(result.error, 'must be positive');
      } else {
        assert.fail('expected failure arm');
      }
    });

    test('the discriminant is the single source of truth across a switch', () => {
      const format = (r: Result<number, string>): string => {
        switch (r.ok) {
          case true:
            return `value:${r.value}`;
          case false:
            return `error:${r.error}`;
        }
      };
      assert.equal(format(parsePositive(7)), 'value:7');
      assert.equal(format(parsePositive(0)), 'error:must be positive');
    });
  });
});
