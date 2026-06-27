import { HttpResponse, http } from 'msw';

// Mirrors the server's CatalogResponse (server/src/modules/catalog/catalog.controller.ts),
// hand-synced for Phase 1. Phase 2: type this against the shared oRPC contract via
// InferRouterOutputs<typeof contract>['catalog']['list'] so drift becomes a compile error.
interface CatalogPlayable {
  id: string;
  title: string;
  kind: 'song' | 'pattern' | 'lesson';
  difficulty: string;
}

interface CatalogResponse {
  items: CatalogPlayable[];
  count: number;
}

const catalog: CatalogResponse = {
  count: 1,
  items: [
    {
      id: 'single-stroke-roll',
      title: 'Single Stroke Roll',
      kind: 'pattern',
      difficulty: 'Debut',
    },
  ],
};

// Wildcard origin (`*/api/catalog`) so matching does not depend on referer-based relative-URL
// resolution — robust regardless of how the request URL is formed.
export const handlers = [http.get('*/api/catalog', () => HttpResponse.json(catalog))];
