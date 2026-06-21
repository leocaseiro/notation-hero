import { Test } from '@nestjs/testing';
import { AboutController } from './about.controller';

describe('AboutController', () => {
  async function makeController(): Promise<AboutController> {
    const moduleRef = await Test.createTestingModule({
      controllers: [AboutController],
    }).compile();
    return moduleRef.get(AboutController);
  }

  it('returns the About payload with name and phase', async () => {
    const controller = await makeController();
    const res = controller.about();
    expect(res.name).toBe('Notation Hero');
    expect(res.phase).toContain('Phase 1');
    expect(res.message).toContain('CloudFront');
  });

  it('computes the timestamp per call (not a frozen literal)', async () => {
    const controller = await makeController();
    const first = controller.about().timestamp;
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = controller.about().timestamp;
    expect(Number.isNaN(Date.parse(first))).toBe(false);
    expect(second >= first).toBe(true);
  });
});
