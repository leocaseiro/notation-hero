// reflect-metadata MUST load first, before any decorated Nest module — keep this the
// first import so bundlers do not hoist a decorated module above it (DI breaks otherwise).
import 'reflect-metadata';

import serverlessExpress from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context,
} from 'aws-lambda';
import type { Express } from 'express';

import { AppModule } from '../app.module';

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
  // Routes answer under /api/* so CloudFront's `/api/*` behaviour forwards the full path.
  app.setGlobalPrefix('api');
  await app.init();
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
  } catch {
    return {
      statusCode: 503,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Service unavailable' }),
    };
  }
  return proxy(event, context);
};
