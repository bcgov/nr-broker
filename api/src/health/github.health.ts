import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { GithubService } from '../github/github.service';

@Injectable()
export class GithubHealthIndicator {
  constructor(
    private readonly github: GithubService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  isHealthy(key: string): HealthIndicatorResult {
    const indicator = this.healthIndicatorService.check(key);
    return indicator.up({
      alias: this.github.isUserAliasEnabled(),
    });
  }
}
