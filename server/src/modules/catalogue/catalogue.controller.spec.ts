import { Test } from '@nestjs/testing';
import { CatalogueController } from './catalogue.controller';

describe('CatalogueController', () => {
  async function makeController(): Promise<CatalogueController> {
    const moduleRef = await Test.createTestingModule({
      controllers: [CatalogueController],
    }).compile();
    return moduleRef.get(CatalogueController);
  }

  it('returns a catalogue listing whose count matches the items', async () => {
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
