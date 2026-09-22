import { HttpException, HttpStatus } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DbExceptionFilter } from './db-exception.filter';
import type { ArgumentsHost } from '@nestjs/common';

/* eslint-disable promise/valid-params --
   The `.catch(exception, host)` calls below are NestJS's ExceptionFilter.catch (2 args), NOT
   Promise.catch (1 arg). promise/valid-params matches any method named `catch` and false-positives
   on the filter's interface method, which is exactly what this file tests. */

function mockHost() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  const host = { switchToHttp: () => ({ getResponse: () => res }) } as unknown as ArgumentsHost;
  return { host, res };
}

describe('DbExceptionFilter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps an unknown error (a DB failure) to a generic 503 — no message leak', () => {
    const { host, res } = mockHost();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    new DbExceptionFilter().catch(new Error('connect ECONNREFUSED nh_app@ep-secret'), host);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(res.json).toHaveBeenCalledWith({ message: 'Service unavailable' });
  });

  it('redacts a Postgres connection string from the server-side log (no plaintext credential)', () => {
    const { host } = mockHost();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    new DbExceptionFilter().catch(
      new Error('query failed: postgresql://nh_app:secret@ep-x.neon.tech/neondb?sslmode=require'),
      host,
    );
    const logged = errSpy.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(logged).not.toContain('secret');
    expect(logged).toContain('[redacted]');
  });

  it('passes an HttpException through unchanged (404 stays 404, body preserved)', () => {
    const { host, res } = mockHost();
    new DbExceptionFilter().catch(new HttpException('Not Found', HttpStatus.NOT_FOUND), host);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith('Not Found');
  });
});
