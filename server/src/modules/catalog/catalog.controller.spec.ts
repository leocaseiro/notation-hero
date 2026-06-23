import { Test } from '@nestjs/testing';
import { CatalogController } from './catalog.controller';

describe('CatalogController', () => {
  async function makeController(): Promise<CatalogController> {
    const moduleRef = await Test.createTestingModule({
      controllers: [CatalogController],
    }).compile();
    return moduleRef.get(CatalogController);
  }

  it('returns a catalog listing whose count matches the items', async () => {
    const controller = await makeController();
    const res = controller.list();
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.count).toBe(res.items.length);
  });

  it('each item carries an id, title, kind and difficulty', async () => {
    const controller = await makeController();
    for (const item of controller.list().items) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(['song', 'pattern', 'lesson']).toContain(item.kind);
      expect(item.difficulty).toBeTruthy();
    }
  });
});
