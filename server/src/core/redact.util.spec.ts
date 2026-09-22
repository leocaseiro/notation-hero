import { afterEach, describe, expect, it } from 'vitest';
import { redactConnectionString } from './redact.util';

const URL_WITH_PW = 'postgresql://nh_app:secret@ep-x.neon.tech/neondb?sslmode=require';

describe('redactConnectionString', () => {
  const original = process.env.DATABASE_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  it('scrubs a postgres:// url in an Error message', () => {
    const out = redactConnectionString(new Error(`connect failed: ${URL_WITH_PW}`));
    expect(out).not.toContain('secret');
    expect(out).toContain('[redacted]');
  });

  it('scrubs a url that appears only in the stack, not the message', () => {
    const err = new Error('opaque');
    err.stack = `Error: opaque\n    at q (${URL_WITH_PW})`;
    const out = redactConnectionString(err);
    expect(out).not.toContain('secret');
  });

  it('scrubs a url carried in a nested error.cause (Node stack omits the cause)', () => {
    const cause = new Error(`driver: ${URL_WITH_PW}`);
    const out = redactConnectionString(new Error('wrapper', { cause }));
    expect(out).not.toContain('secret');
    expect(out).toContain('[redacted]');
  });

  it('scrubs the postgres.js keyword DSN form (password=...)', () => {
    const out = redactConnectionString(
      'error: host=ep-x.neon.tech user=nh_app password=secret db=neondb',
    );
    expect(out).not.toContain('secret');
    expect(out).toContain('password=[redacted]');
  });

  it('scrubs a url in a non-Error value (the non-Error string path)', () => {
    const out = redactConnectionString(`raw string with ${URL_WITH_PW}`);
    expect(out).not.toContain('secret');
  });

  it('scrubs the verbatim DATABASE_URL even without a postgres:// scheme', () => {
    process.env.DATABASE_URL = 'connection-value-token';
    const out = redactConnectionString(new Error('connecting to connection-value-token'));
    expect(out).not.toContain('connection-value-token');
    expect(out).toContain('[redacted-connection-string]');
  });

  it('leaves a credential-free message untouched', () => {
    expect(redactConnectionString(new Error('plain failure'))).toContain('plain failure');
  });
});
