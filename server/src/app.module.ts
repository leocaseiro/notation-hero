import { Module } from '@nestjs/common';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthModule } from './modules/health/health.module';

@Module({ imports: [CatalogModule, HealthModule] })
export class AppModule {}
