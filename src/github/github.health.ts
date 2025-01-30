import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { GithubService } from './github.service';
import { GithubSyncService } from './github-sync.service';

@Injectable()
export class GithubHealthIndicator {
  constructor(
    private readonly githubService: GithubService,
    private readonly githubSyncService: GithubSyncService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    return indicator.up({
      enabled: this.githubSyncService.isEnabled(),
      alias: this.githubService.isUserAliasEnabled(),
      sync: this.githubSyncService.isEnabled(),
    });
  }
}
