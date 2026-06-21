import { NestFactory } from '@nestjs/core';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Minimal API Gateway v2.0 event — the payload shape a Lambda Function URL emits. */
function event(method: string, path: string): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: path,
    rawQueryString: '',
    headers: { host: 'example.com', 'x-forwarded-proto': 'https' },
    requestContext: {
      accountId: '123456789012',
      apiId: 'api',
      domainName: 'example.com',
      domainPrefix: 'api',
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest',
      },
      requestId: 'req-id',
      routeKey: '$default',
      stage: '$default',
      time: '01/Jan/2026:00:00:00 +0000',
      timeEpoch: 1_700_000_000_000,
    },
    isBase64Encoded: false,
  };
}

const ctx = {} as Context;

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('lambda handler (serverless-express)', () => {
  it('serves GET /api/health (200) through the real Nest DI graph', async () => {
    const { handler } = await import('./http.handler.js');
    const res = await handler(event('GET', '/api/health'), ctx);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual({ status: 'ok' });
  });

  it('bootstraps the Nest app once across repeated invocations', async () => {
    const createSpy = vi.spyOn(NestFactory, 'create');
    const { handler } = await import('./http.handler.js');
    const first = await handler(event('GET', '/api/health'), ctx);
    const second = await handler(event('GET', '/api/health'), ctx);
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it('returns 404 for an unknown route', async () => {
    const { handler } = await import('./http.handler.js');
    const res = await handler(event('GET', '/api/nope'), ctx);
    expect(res.statusCode).toBe(404);
  });

  it('returns a structured 503 (not an opaque crash) when bootstrap fails', async () => {
    // Mocking NestFactory.create proves the spy reaches the freshly-imported handler module —
    // which is also what makes the "bootstraps once" count assertion above meaningful.
    vi.spyOn(NestFactory, 'create').mockRejectedValueOnce(new Error('boom'));
    const { handler } = await import('./http.handler.js');
    const res = await handler(event('GET', '/api/health'), ctx);
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body as string)).toEqual({ message: 'Service unavailable' });
  });
});
