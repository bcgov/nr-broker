import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';
import { VaultService } from '../vault/vault.service';

describe('TokenService', () => {
  let service: TokenService;
  const env = process.env;

  async function setupService(env: any) {
    vi.resetModules();
    process.env = { ...env };
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenService],
    })
      .useMocker((token) => {
        if (token === VaultService) {
          return {
            hasValidToken: vi.fn(() => true),
            getAuthTokenLookupSelf: vi.fn(() => ({
              subscribe: vi.fn(),
            })),
          };
        }
        return vi.fn();
      })
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
