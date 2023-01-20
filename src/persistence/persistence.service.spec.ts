import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { PersistenceService } from './persistence.service';

xdescribe('PersistenceService', () => {
  let service: PersistenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PersistenceService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<PersistenceService>(PersistenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
