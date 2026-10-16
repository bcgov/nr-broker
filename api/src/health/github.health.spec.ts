import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import { GithubService } from '../github/github.service';
import { GithubHealthIndicator } from './github.health';

describe('GithubHealthIndicator', () => {
  let indicator: GithubHealthIndicator;
  const aliasEnabled = vi.fn();
  const up = vi.fn();
  const healthIndicatorService = {
    check: vi.fn().mockReturnValue({ up }),
  };

  beforeEach(async () => {
    aliasEnabled.mockReset();
    up.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubHealthIndicator,
        {
          provide: GithubService,
          useValue: { isUserAliasEnabled: aliasEnabled },
        },
        {
          provide: HealthIndicatorService,
          useValue: healthIndicatorService,
        },
      ],
    }).compile();
    indicator = module.get(GithubHealthIndicator);
  });

  it('reports whether GitHub OAuth alias linking is configured', () => {
    aliasEnabled.mockReturnValue(true);

    indicator.isHealthy('github');

    expect(up).toHaveBeenCalledWith({ alias: true });
  });

  it('reports alias linking as disabled when OAuth is not configured', () => {
    aliasEnabled.mockReturnValue(false);

    indicator.isHealthy('github');

    expect(up).toHaveBeenCalledWith({ alias: false });
  });
});
