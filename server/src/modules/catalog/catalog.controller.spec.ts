import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogController, toDifficulty } from './catalog.controller';

// The thin read builds a neon-http client at call time; mock both driver modules so no live DB is
// needed. `vi.hoisted` makes fakeRows available to the (hoisted) vi.mock factory AND the assertions
// below — referencing a plain top-level const inside vi.mock would throw (it is hoisted above it).
const { fakeRows } = vi.hoisted(() => ({
  fakeRows: [
    { id: 'pat_ssr_debut', title: 'Single Stroke Roll (Debut)', kind: 'pattern', level: 0 },
    { id: 'song_demo', title: 'Demo Song', kind: 'song', level: 4 },
    { id: 'lesson_x', title: 'Ungraded Lesson', kind: 'lesson', level: null },
  ],
}));

vi.mock('@neondatabase/serverless', () => ({ neon: () => ({}) }));
// The chain is extracted into named steps to stay within sonarjs/no-nested-functions (max 4 levels).
vi.mock('drizzle-orm/neon-http', () => {
  const limited = { limit: () => Promise.resolve(fakeRows) };
  const filtered = { where: () => limited };
  const selected = { from: () => filtered };
  const queried = { select: () => selected };
  return { drizzle: () => queried };
});

describe('toDifficulty (N-14 bands: Debut 0 · Beginner 1-3 · Intermediate 4-6 · Advanced 7-8 · Expert 9-10)', () => {
  it.each([
    [0, 'Debut'],
    [1, 'Beginner 1'],
    [3, 'Beginner 3'],
    [4, 'Intermediate 4'],
    [6, 'Intermediate 6'],
    [7, 'Advanced 7'],
    [8, 'Advanced 8'],
    [9, 'Expert 9'],
    [10, 'Expert 10'],
    [null, 'Ungraded'],
  ])('level %s -> %s', (level, expected) => {
    expect(toDifficulty(level)).toBe(expected);
  });
});

describe('CatalogController (DB-backed thin read)', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://test';
  });

  async function makeController(): Promise<CatalogController> {
    const moduleRef = await Test.createTestingModule({
      controllers: [CatalogController],
    }).compile();
    return moduleRef.get(CatalogController);
  }

  it('maps rows to the catalog envelope, deriving difficulty from level', async () => {
    const controller = await makeController();
    const res = await controller.list();
    expect(res.count).toBe(3);
    expect(res.items[0]).toEqual({
      id: 'pat_ssr_debut',
      title: 'Single Stroke Roll (Debut)',
      kind: 'pattern',
      difficulty: 'Debut',
    });
    expect(res.items[1]?.difficulty).toBe('Intermediate 4');
    expect(res.items[2]?.difficulty).toBe('Ungraded');
  });
});
