import { Controller, Get } from '@nestjs/common';

export interface CatalogPlayable {
  id: string;
  title: string;
  kind: 'song' | 'pattern' | 'lesson';
  /** Difficulty band label (Debut / Beginner 1-3 / Intermediate 4-6 / ...). */
  difficulty: string;
}

export interface CatalogResponse {
  items: CatalogPlayable[];
  count: number;
}

@Controller('catalog')
export class CatalogController {
  @Get()
  list(): CatalogResponse {
    // PLACEHOLDER data — proves the live API leg today. The real listing comes from the
    // core/catalog domain + a Neon-Postgres adapter against the locked notation/playable
    // model (Phase-2 CMS CRUD, spec'd separately), and the response shape is formalised by
    // the shared/ oRPC contract. Drum rudiments are public-domain, safe placeholders.
    const items: CatalogPlayable[] = [
      {
        id: 'single-stroke-roll',
        title: 'Single Stroke Roll',
        kind: 'pattern',
        difficulty: 'Debut',
      },
      {
        id: 'double-stroke-roll',
        title: 'Double Stroke Roll',
        kind: 'pattern',
        difficulty: 'Beginner 1',
      },
      {
        id: 'single-paradiddle',
        title: 'Single Paradiddle',
        kind: 'pattern',
        difficulty: 'Beginner 2',
      },
      { id: 'demo-groove', title: 'Demo Groove', kind: 'song', difficulty: 'Intermediate 4' },
    ];
    return { items, count: items.length };
  }
}
