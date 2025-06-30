import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { ConnectionConfigDto } from '../persistence/dto/connection-config.dto';
import { GithubService } from '../github/github.service';
import { AuthService } from '../auth/auth.service';

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

  async generateGitHubAuthorizeUrl(request: Request) {
    const user = await this.authService.getUser(request);

    return {
      url: await this.github.generateAuthorizeUrl(user),
    };
  }
}
