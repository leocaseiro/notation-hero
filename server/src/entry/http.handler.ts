// reflect-metadata MUST load first, before any decorated Nest module — keep this the
// first import so bundlers do not hoist a decorated module above it (DI breaks otherwise).
import 'reflect-metadata';

import serverlessExpress from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DbExceptionFilter } from './db-exception.filter';
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda';
import type { Express } from 'express';

// A Lambda Function URL always emits the API Gateway v2.0 payload and expects the structured
// (object) result — never the bare-string variant — so the return is narrowed accordingly.
type ProxyHandler = (
  event: APIGatewayProxyEventV2,
  context: Context,
) => Promise<APIGatewayProxyStructuredResultV2>;

// Cached across warm invocations — the Nest app boots once per container, not per request.
let cachedHandler: ProxyHandler | undefined;

async function bootstrap(): Promise<ProxyHandler> {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  try {
    app.useGlobalFilters(new DbExceptionFilter());
    // Routes answer under /api/* so CloudFront's `/api/*` behaviour forwards the full path.
    app.setGlobalPrefix('api');
    await app.init();
  } catch (error) {
    // Close the half-initialised app so a failed boot does not leak it on the warm container
    // (the handler's `??=` retries, so each failed attempt would otherwise accumulate one).
    try {
      await app.close();
    } catch {
      // ignore close failures — we are already propagating the original boot error
    }
    throw error;
  }
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  // serverless-express returns an aws-lambda Handler (event, context, callback?). In promise
  // mode we invoke it with (event, context); cast through unknown to the 2-arg shape we use.
  return serverlessExpress({ app: expressApp }) as unknown as ProxyHandler;
}

export const handler: ProxyHandler = async (event, context) => {
  let proxy: ProxyHandler;
  try {
    // `??=` only assigns on success, so a failed boot is never cached — the next call retries.
    proxy = cachedHandler ??= await bootstrap();
  } catch (error) {
    // Surface the cause — Lambda forwards stderr to CloudWatch; without this the 503 is opaque.
    console.error('[http.handler] bootstrap failed:', error);
    return {
      statusCode: 503,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Service unavailable' }),
    };
  }
  return proxy(event, context);
};
