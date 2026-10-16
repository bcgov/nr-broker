import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

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
   * Queue a catalog scan for each configured GitHub organization.
   */
  @Post('catalog/scan')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  @Roles('admin')
  @HttpCode(204)
  @ApiResponse({
    status: 204,
    description: 'Organization scans queued',
  })
  async scanCatalog() {
    if (!this.githubCatalogService.isEnabled()) {
      throw new BadRequestException(
        'GitHub catalog scanning is not configured. Set the catalog organizations and GitHub sync credentials, then retry.',
      );
    }
    await this.githubCatalogService.enqueueOrgScans();
  }
}
