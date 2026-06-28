import assert from 'node:assert/strict';
import { afterEach, test } from 'vitest';
import { requireEnv } from './require-env.ts';

const KEY = 'NH_TEST_REQUIRE_ENV';

afterEach(() => {
  delete process.env[KEY];
});

test('requireEnv returns the value when the env var is set', () => {
  process.env[KEY] = 'present';
  assert.equal(requireEnv(KEY), 'present');
});

test('requireEnv throws a remediation-hint error when the env var is missing', () => {
  delete process.env[KEY];
  assert.throws(() => requireEnv(KEY), /NH_TEST_REQUIRE_ENV is required/);
});
