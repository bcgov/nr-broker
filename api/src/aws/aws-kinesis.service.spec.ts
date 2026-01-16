import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AwsKinesisService } from './aws-kinesis.service';

describe.skip('AwsKinesisService', () => {
  let service: AwsKinesisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AwsKinesisService],
    })
      .useMocker(() => {
        return vi.fn();
      })
      .compile();

    service = module.get<AwsKinesisService>(AwsKinesisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
