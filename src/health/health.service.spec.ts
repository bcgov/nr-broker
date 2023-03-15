import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { HealthService } from './health.service';
import { TokenService } from '../token/token.service';

describe('HealthService', () => {
  let service: HealthService;
  let tokenService: DeepMocked<TokenService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        TokenService,
        {
          provide: TokenService,
          useValue: createMock<TokenService>(),
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    tokenService = module.get(TokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('check should return true if there is a valid token', () => {
    tokenService.hasValidToken.mockReturnValue(true);
    expect(service.check()).toBe(true);
  });

  it('check should throw error if there is no valid token', () => {
    tokenService.hasValidToken.mockReturnValue(false);
    expect(() => {
      service.check();
    }).toThrow();
  });
});
