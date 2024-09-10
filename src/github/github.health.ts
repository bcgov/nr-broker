import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { GithubService } from './github.service';

@Injectable()
export class GithubHealthIndicator extends HealthIndicator {
  constructor(private readonly githubService: GithubService) {
    super();
  }
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const result = this.getStatus(key, this.githubService.isEnabled(), {
      enabled: this.githubService.isEnabled(),
    });

    return result;
  }
}
