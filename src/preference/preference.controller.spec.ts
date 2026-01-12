import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PreferenceController } from './preference.controller';

describe('PreferenceController', () => {
  let controller: PreferenceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PreferenceController],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    controller = module.get<PreferenceController>(PreferenceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
