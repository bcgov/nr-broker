import {
  Body,
  Controller,
  Get,
  NotFoundException,
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
import { UserImportDto } from './dto/user-import.dto';
import { UserRolesDto } from './dto/user-roles.dto';
import { AccountPermission } from '../account-permission.decorator';
import { CollectionSearchQuery } from './dto/collection-search-query.dto';
import { get } from 'radash';
import { UserCollectionService } from './user-collection.service';
import { CollectionNames } from '../persistence/dto/collection-dto-union.type';

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
  @UsePipes(
    new ValidationPipe({
      transform: true,
    }),
  )
  async userImport(
    @Request() req: ExpressRequest,
    @Body() userDto: UserImportDto,
  ): Promise<void> {
    await this.userCollectionService.upsertUser(req, userDto);
  }

  @Get('config')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  getCollectionConfig() {
    return this.service.getCollectionConfig();
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

  @Get('service/:id/secure')
  @Roles('admin')
  @AllowOwner({
    graphObjectType: 'collection',
    graphObjectCollection: 'brokerAccount',
    graphIdFromParamKey: 'id',
    requiredEdgeNames: ['administrator', 'lead-developer'],
    upstreamRecursive: true,
  })
  @UseGuards(BrokerOidcAuthGuard)
  async getServiceSecureInfo(@Param('id') id: string) {
    return this.service.getServiceSecureInfo(id);
  }

  @Get(':collection')
  @UseGuards(BrokerCombinedAuthGuard)
  async getCollectionByVertexId(
    @Param('collection') collection: string,
    @Query('vertex') vertexId: string,
  ) {
    return this.service.getCollectionByVertexId(
      this.parseCollectionApi(collection),
      vertexId,
    );
  }

  @Get(':collection/:id')
  @UseGuards(BrokerCombinedAuthGuard)
  async getCollectionById(
    @Param('collection') collection: string,
    @Param('id') id: string,
  ) {
    return this.service.getCollectionById(
      this.parseCollectionApi(collection),
      id,
    );
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
    return this.service.searchCollection(
      this.parseCollectionApi(collection),
      query.upstreamVertex,
      query.vertexId,
      query.offset,
      query.limit,
    );
  }

  @Post(':collection/unique/:key/:value')
  @UseGuards(BrokerCombinedAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async doUniqueKeyCheck(
    @Param('collection') collection: string,
    @Param('key') key: string,
    @Param('value') value: string,
  ) {
    return this.service.doUniqueKeyCheck(
      this.parseCollectionApi(collection),
      key,
      value,
    );
  }

  private parseCollectionApi(collection: string): CollectionNames {
    switch (collection) {
      case 'environment':
      case 'project':
      case 'service':
      case 'team':
      case 'user':
        return collection;
      case 'broker-account':
        return 'brokerAccount';
      case 'service-instance':
        return 'serviceInstance';
      default:
        throw new NotFoundException();
    }
  }
}
