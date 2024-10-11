import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { get } from 'radash';

import { BrokerOidcAuthGuard } from '../auth/broker-oidc-auth.guard';
import { OAUTH2_CLIENT_MAP_GUID } from '../constants';
import { PackageService } from './package.service';
import { PackageBuildDto } from '../persistence/dto/package-build.dto';
import { BrokerCombinedAuthGuard } from '../auth/broker-combined-auth.guard';
import { PackageBuildSearchQuery } from '../collection/dto/package-build-search-query.dto';
import { PackageBuildSearchResult } from '../persistence/dto/package-build-rest.dto';

@Controller({
  path: 'package',
  version: '1',
})
export class PackageController {
  constructor(private readonly service: PackageService) {}

  @Post('search')
  @UseGuards(BrokerOidcAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiQuery({
    name: 'serviceId',
    required: true,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
  })
  @ApiQuery({
    name: 'dir',
    required: false,
  })
  async search(
    @Query() query: PackageBuildSearchQuery,
  ): Promise<PackageBuildSearchResult> {
    return this.service.search(
      query.serviceId,
      query.sort,
      query.dir,
      query.offset,
      query.limit,
    );
  }

  @Get(':id')
  @UseGuards(BrokerCombinedAuthGuard)
  async get(@Param('id') id: string): Promise<PackageBuildDto> {
    return this.service.get(id);
  }

  @Post(':id/approve')
  @UseGuards(BrokerOidcAuthGuard)
  async approve(
    @Req() req: ExpressRequest,
    @Param('id') id: string,
  ): Promise<boolean> {
    const userGuid: string = get(
      (req.user as any).userinfo,
      OAUTH2_CLIENT_MAP_GUID,
    );
    if (!userGuid) {
      throw new BadRequestException();
    }

    return await this.service.approve(req, id, userGuid);
  }
}
