import { Module } from '@nestjs/common';
import { CATALOG_DB, createCatalogDb } from '../../adapters/neon-postgres/catalog-db.adapter';
import { CatalogController } from './catalog.controller';

@Module({
  controllers: [CatalogController],
  // The nh_app neon-http client as a singleton provider (NH-79 review F12) — the controller injects
  // CATALOG_DB instead of building + memoizing the client at module scope.
  providers: [{ provide: CATALOG_DB, useFactory: createCatalogDb }],
})
export class CatalogModule {}
