import { Controller, Get } from '@nestjs/common';

export interface AboutResponse {
  name: string;
  phase: string;
  message: string;
  /** Computed per request — its presence on the page proves the Lambda actually ran. */
  timestamp: string;
}

@Controller('about')
export class AboutController {
  @Get()
  about(): AboutResponse {
    return {
      name: 'Notation Hero',
      phase: 'Phase 1 — deployable AWS slice',
      message: 'Served end-to-end through AWS: CloudFront → Lambda Function URL → NestJS.',
      timestamp: new Date().toISOString(),
    };
  }
}
