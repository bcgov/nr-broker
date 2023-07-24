import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiBearerAuth, ApiOAuth2 } from '@nestjs/swagger';
import { OAUTH2_CLIENT_MAP_GUID } from '../constants';
import { CollectionService } from './collection.service';
import { BrokerOidcAuthGuard } from '../auth/broker-oidc-auth.guard';
import { BrokerCombinedAuthGuard } from '../auth/broker-combined-auth.guard';
import { AccountService } from './account.service';
import { Roles } from '../roles.decorator';
import { UserUpstream } from '../user-upstream.decorator';

import { BrokerAccountDto } from '../persistence/dto/broker-account.dto';
import { CollectionConfigDto } from '../persistence/dto/collection-config.dto';
import { UserDto } from '../persistence/dto/user.dto';

@Controller({
  path: 'collection',
  version: '1',
})
export class CollectionController {
  constructor(
    private accountService: AccountService,
    private service: CollectionService,
  ) {}

  @Get('user/self')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiOAuth2(['openid', 'profile'])
  async user(@Request() req: ExpressRequest): Promise<UserDto> {
    return await this.service.upsertUser(req, (req.user as any).userinfo);
  }

  @Get('config')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  getCollectionConfig(): Promise<CollectionConfigDto[]> {
    return this.service.getCollectionConfig();
  }

  @Get('broker-account')
  @UseGuards(BrokerCombinedAuthGuard)
  async getAccountByVertexId(
    @Query('vertex') vertexId: string,
  ): Promise<BrokerAccountDto> {
    return this.service.getCollectionByVertexId('brokerAccount', vertexId);
  }

  @Get('broker-account/:id/token')
  @UseGuards(BrokerOidcAuthGuard)
  async getAccounts(@Param('id') id: string) {
    return this.accountService.getRegisteryJwts(id);
  }

  @Post('broker-account/:id/token')
  @Roles('admin')
  @UserUpstream({
    collection: 'brokerAccount',
    edgeName: 'administrator',
    param: 'id',
  })
  @UseGuards(BrokerOidcAuthGuard)
  async generateAccountToken(
    @Param('id') id: string,
    @Request() req: ExpressRequest,
  ) {
    return this.accountService.generateAccountToken(
      req,
      id,
      (req.user as any).userinfo[OAUTH2_CLIENT_MAP_GUID],
    );
  }

  @Get(':collection')
  @UseGuards(BrokerCombinedAuthGuard)
  async getCollectionByVertexId(
    @Param('collection') collection: string,
    @Query('vertex') vertexId: string,
  ) {
    switch (collection) {
      case 'environment':
      case 'project':
      case 'service':
      case 'team':
      case 'user':
        return this.service.getCollectionByVertexId(collection, vertexId);
      case 'service-instance':
        return this.service.getCollectionByVertexId(
          'serviceInstance',
          vertexId,
        );
    }
  }
}
