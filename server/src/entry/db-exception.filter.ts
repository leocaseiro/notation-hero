import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { redactConnectionString } from '../core/redact.util';
import type { Response } from 'express';

// Public /api/* catch-all: pass HttpExceptions (404, etc.) through unchanged, but map any other
// thrown error (a Neon/Drizzle connection or query failure) to a generic 503 — never echo the error
// message or stack to the response. The cause is logged server-side (CloudWatch).
@Catch()
export class DbExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    console.error('[api] unhandled error:', redactConnectionString(exception));
    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ message: 'Service unavailable' });
  }
}
