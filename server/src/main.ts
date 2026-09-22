// Load server/.env into process.env for LOCAL dev only (the Nest CLI does not do this itself).
// Must run before AppModule imports so process.env.DATABASE_URL is set by request time. The Lambda
// entry (src/entry/http.handler.ts) does NOT import this — there the platform injects env vars.
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const port = process.env.PORT ?? 3001;
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  // Match the Lambda entry (src/entry/http.handler.ts) so local dev and CloudFront agree on /api/*.
  app.setGlobalPrefix('api');
  // Default 3001 so local dev doesn't collide with the Vite dev server on 3000 (Vite proxies
  // /api -> :3001). Override with PORT. On Lambda the entry is http.handler.ts, not this listener.
  await app.listen(port);

  // Log a clickable localhost URL. app.getUrl() reports the IPv6 form http://[::1]:<port>, which
  // many browsers won't open; `port` is built above so we compose the URL directly.
  logger.log(`Application is running on: http://localhost:${String(port)}`);
}
void bootstrap();
