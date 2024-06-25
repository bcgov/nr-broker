import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { AwsKinesisService } from './aws-kinesis.service';

xdescribe('AwsKinesisService', () => {
  let service: AwsKinesisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AwsKinesisService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<AwsKinesisService>(AwsKinesisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
