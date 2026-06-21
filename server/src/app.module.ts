import { Module } from '@nestjs/common';
import { CatalogueModule } from './modules/catalogue/catalogue.module';
import { HealthModule } from './modules/health/health.module';

@Module({ imports: [CatalogueModule, HealthModule] })
export class AppModule {}
