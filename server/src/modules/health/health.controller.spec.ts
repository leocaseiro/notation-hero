import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  it('returns ok via injected service', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    const controller = moduleRef.get(HealthController);
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
