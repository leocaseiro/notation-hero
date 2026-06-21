import { Module } from '@nestjs/common';
import { AboutModule } from './modules/about/about.module';
import { HealthModule } from './modules/health/health.module';

@Module({ imports: [AboutModule, HealthModule] })
export class AppModule {}
