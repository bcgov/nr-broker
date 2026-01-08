import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PackageService } from './package.service';

describe('PackageService', () => {
  let service: PackageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PackageService],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    service = module.get<PackageService>(PackageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
