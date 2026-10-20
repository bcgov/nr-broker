import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';

import { BrokerOidcAuthGuard } from '../auth/broker-oidc-auth.guard';
import { Roles } from '../roles.decorator';
import { GithubCatalogService } from './github-catalog.service';

@Controller({
  path: 'github',
  version: '1',
})
export class GithubController {
  constructor(private readonly githubCatalogService: GithubCatalogService) {}

  /**
   * Queue a catalog scan for the repository at the given URL or, if no URL is
   * given, for each configured GitHub organization.
   */
  @Post('catalog/scan')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  @Roles('admin')
  @HttpCode(204)
  @ApiQuery({
    name: 'url',
    required: false,
    description: 'URL of a single repository to scan',
  })
  @ApiResponse({
    status: 204,
    description: 'Scans queued',
  })
  async scanCatalog(@Query('url') url?: string) {
    if (url) {
      if (!this.githubCatalogService.isSyncEnabled()) {
        throw new BadRequestException(
          'GitHub catalog scanning is not configured. Set the GitHub sync credentials, then retry.',
        );
      }
      if (!(await this.githubCatalogService.enqueueRepoScan(url))) {
        throw new BadRequestException(
          'The URL is not a managed GitHub repository URL. Use a URL such as https://github.com/<owner>/<repository>, then retry.',
        );
      }
      return;
    }
    if (!this.githubCatalogService.isEnabled()) {
      throw new BadRequestException(
        'GitHub catalog scanning is not configured. Set the catalog organizations and GitHub sync credentials, then retry.',
      );
    }
    await this.githubCatalogService.enqueueOrgScans();
  }
}
