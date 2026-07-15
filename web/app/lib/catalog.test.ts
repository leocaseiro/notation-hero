import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchCatalog } from './catalog';

const OK_RESPONSE = {
  items: [
    {
      id: 'song_demo',
      slug: 'demo-song',
      title: 'Demo Song',
      kind: 'song',
      difficulty: 'Intermediate 4',
      level: 4,
    },
    {
      id: 'lesson_x',
      slug: 'ungraded-lesson',
      title: 'Ungraded Lesson',
      kind: 'lesson',
      difficulty: 'Ungraded',
      level: null,
    },
  ],
  count: 2,
};

describe('fetchCatalog', () => {
  const originalBase = process.env.API_BASE_URL;

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.API_BASE_URL = originalBase;
  });

  it('fetches the server catalog API and returns its items', async () => {
    process.env.API_BASE_URL = 'http://localhost:3001';
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(OK_RESPONSE) });
    vi.stubGlobal('fetch', fetchMock);

    const items = await fetchCatalog();

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/catalog');
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual(OK_RESPONSE.items[0]);
  });

  it('throws when the API responds non-OK (trips the route error boundary)', async () => {
    process.env.API_BASE_URL = 'http://localhost:3001';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: () => Promise.resolve({}) }),
    );

    await expect(fetchCatalog()).rejects.toThrow(/503/);
  });

  it('throws when API_BASE_URL is unset', async () => {
    delete process.env.API_BASE_URL;
    await expect(fetchCatalog()).rejects.toThrow('API_BASE_URL is not set');
  });
});
