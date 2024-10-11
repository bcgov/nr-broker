import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { GithubService } from './github.service';
import { GithubSyncService } from './github-sync.service';

@Injectable()
export class GithubHealthIndicator extends HealthIndicator {
  constructor(
    private readonly githubService: GithubService,
    private readonly githubSyncService: GithubSyncService,
  ) {
    super();
  }
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const result = this.getStatus(key, this.githubSyncService.isEnabled(), {
      alias: this.githubService.isUserAliasEnabled(),
      sync: this.githubSyncService.isEnabled(),
    });

    return result;
  }
}
