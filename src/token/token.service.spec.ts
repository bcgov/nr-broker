import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  const env = process.env;

  async function setupService(env: any) {
    jest.resetModules();
    process.env = { ...env };
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<TokenService>(TokenService);
  }

  beforeEach(async () => {
    return setupService(env);
  });

  afterEach(() => {
    process.env = env;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
