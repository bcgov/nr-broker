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
import { PreferenceRestDto } from 'src/persistence/dto/preference-rest.dto';

@Controller({
  path: 'preference',
  version: '1',
})
export class PreferenceController {
  constructor(private service: PreferenceService) {}

  @Get('self')
  @UseGuards(BrokerOidcAuthGuard)
  async getSelf(@Request() req: ExpressRequest): Promise<PreferenceRestDto> {
    const guid: string = (req.user as any).userinfo[OAUTH2_CLIENT_MAP_GUID];
    if (!guid) {
      throw new BadRequestException();
    }
    return await this.service.getPreferences(guid);
  }

  @Post('self')
  @UseGuards(BrokerOidcAuthGuard)
  async setSelf(
    @Request() req: ExpressRequest,
    @Body() preference: PreferenceRestDto,
  ): Promise<boolean> {
    const guid: string = (req.user as any).userinfo[OAUTH2_CLIENT_MAP_GUID];
    if (!guid) {
      throw new BadRequestException();
    }
    return await this.service.setPreferences(guid, preference);
  }
}
