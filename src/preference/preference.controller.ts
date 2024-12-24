import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

import { OAUTH2_CLIENT_MAP_GUID } from '../constants';
import { PreferenceService } from './preference.service';
import { BrokerOidcAuthGuard } from '../auth/broker-oidc-auth.guard';
import { PreferenceDto } from '../persistence/dto/preference.dto';
import get from 'lodash.get';

@Controller({
  path: 'preference',
  version: '1',
})
export class PreferenceController {
  constructor(private readonly service: PreferenceService) {}

  @Get('self')
  @UseGuards(BrokerOidcAuthGuard)
  async getSelf(@Request() req: ExpressRequest): Promise<PreferenceDto> {
    const guid: string = get(
      (req.user as any).userinfo,
      OAUTH2_CLIENT_MAP_GUID,
    );
    if (!guid) {
      throw new BadRequestException();
    }
    return await this.service.getPreferences(guid);
  }

  @Post('self')
  @UseGuards(BrokerOidcAuthGuard)
  async setSelf(
    @Request() req: ExpressRequest,
    @Body() preference: PreferenceDto,
  ): Promise<boolean> {
    const guid: string = get(
      (req.user as any).userinfo,
      OAUTH2_CLIENT_MAP_GUID,
    );
    if (!guid) {
      throw new BadRequestException();
    }
    await this.service.setPreferences(guid, preference);
    return true;
  }
}
