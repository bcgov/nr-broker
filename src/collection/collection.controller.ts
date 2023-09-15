import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiBearerAuth, ApiOAuth2, ApiQuery } from '@nestjs/swagger';
import { OAUTH2_CLIENT_MAP_GUID } from '../constants';
import { CollectionService } from './collection.service';
import { BrokerOidcAuthGuard } from '../auth/broker-oidc-auth.guard';
import { BrokerCombinedAuthGuard } from '../auth/broker-combined-auth.guard';
import { AccountService } from './account.service';
import { Roles } from '../roles.decorator';
import { AllowOwner } from '../allow-owner.decorator';
import { BrokerAccountDto } from '../persistence/dto/broker-account.dto';
import { CollectionConfigDto } from '../persistence/dto/collection-config.dto';
import { UserImportDto } from './dto/user-import.dto';
import { UserRolesDto } from './dto/user-roles.dto';
import { AccountPermission } from '../account-permission.decorator';
import { CollectionSearchQuery } from './dto/collection-search-query.dto';
import { get } from 'radash';
import { UserCollectionService } from './user-collection.service';

@Controller({
  path: 'collection',
  version: '1',
})
export class CollectionController {
  constructor(
    private readonly accountService: AccountService,
    private readonly service: CollectionService,
    private readonly userCollectionService: UserCollectionService,
  ) {}

  @Get('user/self')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiOAuth2(['openid', 'profile'])
  async user(@Request() req: ExpressRequest): Promise<UserRolesDto> {
    return await this.userCollectionService.extractUserFromRequest(req);
  }

  @Post('user/import')
  @UseGuards(BrokerCombinedAuthGuard)
  @Roles('admin')
  @AccountPermission('enableUserImport')
  @ApiBearerAuth()
  async userImport(
    @Request() req: ExpressRequest,
    @Body() userDto: UserImportDto,
  ): Promise<void> {
    await this.userCollectionService.upsertUser(req, userDto);
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
  @AllowOwner({
    graphObjectType: 'collection',
    graphObjectCollection: 'brokerAccount',
    graphIdFromParamKey: 'id',
    requiredEdgeNames: ['administrator', 'lead-developer'],
    upstreamRecursive: true,
  })
  @UseGuards(BrokerOidcAuthGuard)
  async generateAccountToken(
    @Param('id') id: string,
    @Request() req: ExpressRequest,
  ) {
    return this.accountService.generateAccountToken(
      req,
      id,
      get((req.user as any).userinfo, OAUTH2_CLIENT_MAP_GUID),
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

  @Post(':collection/search')
  @UseGuards(BrokerCombinedAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiQuery({
    name: 'upstreamVertex',
    required: false,
  })
  @ApiQuery({
    name: 'vertexId',
    required: false,
  })
  async getCollections(
    @Param('collection') collection: string,
    @Query() query: CollectionSearchQuery,
  ) {
    switch (collection) {
      case 'environment':
      case 'project':
      case 'service':
      case 'team':
      case 'user':
        return this.service.searchCollection(
          collection,
          query.upstreamVertex,
          query.vertexId,
          query.offset,
          query.limit,
        );
      case 'service-instance':
        return this.service.searchCollection(
          'serviceInstance',
          query.upstreamVertex,
          query.vertexId,
          query.offset,
          query.limit,
        );
    }
  }
}
