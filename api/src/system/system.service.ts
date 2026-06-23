import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { ConnectionConfigDto } from '../persistence/dto/connection-config.dto';
import { FeatureFlagsDto } from '../persistence/dto/feature-flags.dto';
import { GithubService } from '../github/github.service';
import { AuthService } from '../auth/auth.service';
import {
  FEATURE_FLAG_TEAM_ROLE_CHIPS,
} from '../constants';

@Injectable()
export class SystemService {
  constructor(
    private readonly authService: AuthService,
    private readonly systemRepository: SystemRepository,
    private readonly github: GithubService,
  ) {}

  async getConnections(): Promise<ConnectionConfigDto[]> {
    return (await this.systemRepository.getConnectionConfigs()).sort(
      (a, b) => a.order - b.order,
    ) as unknown as ConnectionConfigDto[];
  }

  getFeatureFlags(): FeatureFlagsDto {
    return {
      teamRoleChips: FEATURE_FLAG_TEAM_ROLE_CHIPS,
    };
  }

  async generateGitHubAuthorizeUrl(request: Request) {
    const user = await this.authService.getUser(request);

    return {
      url: await this.github.generateAuthorizeUrl(user),
    };
  }
}
