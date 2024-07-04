import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { get } from 'radash';
import { BrokerOidcAuthGuard } from '../auth/broker-oidc-auth.guard';
import { OAUTH2_CLIENT_MAP_GUID } from '../constants';
import { PackageService } from './package.service';
import { PackageBuildDto } from '../persistence/dto/package-build.dto';

@Controller({
  path: 'package',
  version: '1',
})
export class PackageController {
  constructor(private readonly service: PackageService) {}

  @Get(':id')
  @UseGuards(BrokerOidcAuthGuard)
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
