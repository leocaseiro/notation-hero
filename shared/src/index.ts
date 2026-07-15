// Shared FE<->BE contract surface for Notation Hero. The typed oRPC contract + Zod schemas
// (spike 2026-06-20 §3) land here with their feature work and are imported by BOTH web/client and
// server. The first real contract is the catalog read response (NH-279).
export type { CatalogItem, CatalogResponse } from './contracts/catalog.js';
