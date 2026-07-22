import { NestFactory } from '@nestjs/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

// The catalog controller is now DB-backed; mock the neon-http driver so the route resolves through
// the real Nest DI graph without a live DB. Rows are inlined (a vi.mock factory cannot close over a
// top-level const). The chain is extracted into named steps to stay within sonarjs/no-nested-functions.
// `neonConfig` is mocked too — the catalog DI factory (NH-79 F12) sets neonConfig.fetchFunction at
// app boot, so the real symbol must exist on the mock.
vi.mock('@neondatabase/serverless', () => ({ neon: () => ({}), neonConfig: {} }));
vi.mock('drizzle-orm/neon-http', () => {
  const rows = [
    {
      id: 'pat_ssr_debut',
      slug: 'single-stroke-roll',
      title: 'Single Stroke Roll',
      kind: 'pattern',
      level: 0,
    },
  ];
  const limited = { limit: () => Promise.resolve(rows) };
  const afterWhere = { orderBy: () => limited };
  const filtered = { where: () => afterWhere };
  const selected = { from: () => filtered };
  const queried = { select: () => selected };
  return { drizzle: () => queried };
});

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

beforeEach(() => {
  // The catalog DI provider builds its neon-http client at app boot (NH-79 F12), so every AppModule
  // bootstrap needs the nh_app url present — the Lambda always has it injected in prod.
  process.env.DATABASE_URL = 'postgres://test';
});

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

  it('logs the cause and retries after a failed cold start (a failed boot is not cached)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const createSpy = vi.spyOn(NestFactory, 'create').mockRejectedValueOnce(new Error('boom'));
    const { handler } = await import('./http.handler.js');

    const first = await handler(event('GET', '/api/health'), ctx);
    expect(first.statusCode).toBe(503);
    expect(createSpy).toHaveBeenCalledTimes(1);
    // The cause is surfaced (Lambda forwards stderr to CloudWatch), not swallowed.
    expect(errSpy).toHaveBeenCalled();

    // `??=` only caches a successful boot, so the next call retries against the real factory.
    createSpy.mockRestore();
    const second = await handler(event('GET', '/api/health'), ctx);
    expect(second.statusCode).toBe(200);
  });

  it('serves GET /api/catalog (200) with the catalog shape through the handler', async () => {
    const { handler } = await import('./http.handler.js');
    const res = await handler(event('GET', '/api/catalog'), ctx);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string) as {
      count: number;
      items: Array<{ id: string; slug: string; title: string; kind: string; difficulty: string }>;
    };
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    expect(typeof body.count).toBe('number');
    // Each item carries the catalog contract the About page renders.
    for (const item of body.items) {
      expect(typeof item.id).toBe('string');
      expect(typeof item.slug).toBe('string');
      expect(typeof item.title).toBe('string');
      expect(typeof item.kind).toBe('string');
      expect(typeof item.difficulty).toBe('string');
    }
  });
});
