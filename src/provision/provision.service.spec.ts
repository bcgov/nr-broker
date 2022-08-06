import { Test, TestingModule } from '@nestjs/testing';
import { ProvisionService } from './provision.service';

describe('ProvisionService', () => {
  let service: ProvisionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProvisionService],
    }).compile();

    service = module.get<ProvisionService>(ProvisionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
