import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Request,
  Response,
  Sse,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import { ApiBearerAuth, ApiOAuth2, ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import get from 'lodash.get';
import {
  OAUTH2_CLIENT_MAP_GUID,
  REDIS_PUBSUB,
  DAYS_10_IN_SECONDS,
} from '../constants';
import { CollectionService } from './collection.service';
import { BrokerOidcAuthGuard } from '../auth/broker-oidc-auth.guard';
import { BrokerJwtAuthGuard } from '../auth/broker-jwt-auth.guard';
import { BrokerCombinedAuthGuard } from '../auth/broker-combined-auth.guard';
import { AccountService } from './account.service';
import { Roles } from '../roles.decorator';
import { AllowOwner } from '../allow-owner.decorator';
import { UserRolesDto } from './dto/user-roles.dto';
import { AccountPermission } from '../account-permission.decorator';
import { CollectionSearchQuery } from './dto/collection-search-query.dto';
import { UserCollectionService } from './user-collection.service';
import { CollectionNames } from '../persistence/dto/collection-dto-union.type';
import { PersistenceCacheKey } from '../persistence/persistence-cache-key.decorator';
import { PersistenceCacheInterceptor } from '../persistence/persistence-cache.interceptor';
import { PERSISTENCE_CACHE_KEY_CONFIG } from '../persistence/persistence.constants';
import { ExpiryQuery } from './dto/expiry-query.dto';
import { RedisService } from '../redis/redis.service';
import { JwtRegistryDto } from '../persistence/dto/jwt-registry.dto';
import { UserBaseDto } from '../persistence/dto/user.dto';
import { TeamCollectionService } from './team-collection.service';

@Controller({
  path: 'collection',
  version: '1',
})
export class CollectionController {
  constructor(
    private readonly accountService: AccountService,
    private readonly service: CollectionService,
    private readonly redis: RedisService,
    private readonly userCollectionService: UserCollectionService,
    private readonly teamCollectionService: TeamCollectionService,
  ) {}

  /**
   * The set of tags for this collection
   */
  @Get(':collection/tags')
  @UseGuards(BrokerCombinedAuthGuard)
  async getCollectionTags(@Param('collection') collection: string) {
    return this.service.getCollectionTags(this.parseCollectionApi(collection));
  }

  /**
   * Logged in user with roles
   */
  @Get('user/self')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiOAuth2(['openid', 'profile'])
  async user(@Request() req: ExpressRequest): Promise<UserRolesDto> {
    return await this.userCollectionService.extractUserFromRequest(req);
  }

  /**
   * GitHub account link return endpoint
   */
  @Get('/user/link-github')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  async linkGithub(
    @Query('code') code: string,
    @Query('state') state: string,
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    const user = await this.userCollectionService.linkGithub(req, state, code);
    res.redirect(`/browse/user/${user.id}`);
  }

  /**
   * Upsert user information
   */
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
    @Body() userDto: UserBaseDto,
  ): Promise<void> {
    await this.userCollectionService.upsertUser(req, userDto);
  }

  @Get('config')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  @PersistenceCacheKey(PERSISTENCE_CACHE_KEY_CONFIG)
  @UseInterceptors(PersistenceCacheInterceptor)
  getCollectionConfig() {
    return this.service.getCollectionConfig();
  }

  @Get('broker-account/:id/token')
  @UseGuards(BrokerOidcAuthGuard)
  async getAccounts(@Param('id') id: string) {
    return this.accountService.getRegisteryJwts(id) as unknown as Promise<
      JwtRegistryDto[]
    >;
  }

  @Post('broker-account/:id/refresh')
  @Roles('admin')
  @AllowOwner({
    graphObjectType: 'collection',
    graphObjectCollection: 'brokerAccount',
    graphIdFromParamKey: 'id',
    permission: 'sudo',
  })
  @UseGuards(BrokerOidcAuthGuard)
  async refresh(@Param('id') id: string): Promise<void> {
    return await this.accountService.refresh(id);
  }

  @Post('team/:id/refresh')
  @Roles('admin')
  @AllowOwner({
    graphObjectType: 'collection',
    graphObjectCollection: 'brokerAccount',
    graphIdFromParamKey: 'id',
    permission: 'sudo',
  })
  @UseGuards(BrokerOidcAuthGuard)
  async refreshGitHub(@Param('id') id: string): Promise<void> {
    return await this.teamCollectionService.refresh(id);
  }

  @Post('broker-account/:id/token')
  @Roles('admin')
  @AllowOwner({
    graphObjectType: 'collection',
    graphObjectCollection: 'brokerAccount',
    graphIdFromParamKey: 'id',
    permission: 'sudo',
  })
  @UseGuards(BrokerOidcAuthGuard)
  @ApiQuery({
    name: 'expiration',
    required: true,
    description: 'Expiration days in seconds',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generateAccountToken(
    @Param('id') id: string,
    @Query() expiryQuery: ExpiryQuery,
    @Request() req: ExpressRequest,
  ) {
    return this.accountService.generateAccountToken(
      req,
      id,
      expiryQuery.expiration,
      expiryQuery.patch ?? false,
      expiryQuery.sync ?? false,
      get((req.user as any).userinfo, OAUTH2_CLIENT_MAP_GUID),
      false,
    );
  }

  @Post('broker-account/:id/usage')
  @Roles('admin')
  @AllowOwner({
    graphObjectType: 'collection',
    graphObjectCollection: 'brokerAccount',
    graphIdFromParamKey: 'id',
    permission: 'sudo',
  })
  @UseGuards(BrokerOidcAuthGuard)
  async getTokenUsage(@Param('id') id: string) {
    return this.accountService.getUsage(id, 1);
  }

  @Post('broker-account/renewal')
  @UseGuards(BrokerJwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  async provisionRenewalToken(
    @Request() request: ExpressRequest,
    @Query('ttl') ttl: number = DAYS_10_IN_SECONDS,
  ) {
    if (isNaN(ttl)) ttl = DAYS_10_IN_SECONDS;
    return this.accountService.renewToken(request, ttl, true);
  }

  @Sse('broker-account/events')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  tokenUpdatedEvents(): Observable<MessageEvent> {
    return this.redis.getEventSource(REDIS_PUBSUB.BROKER_ACCOUNT_TOKEN);
  }

  @Get('service/:id/details')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  async getServiceDetails(@Param('id') id: string) {
    return this.service.getServiceDetails(id);
  }

  @Get('service/:id/secure')
  @Roles('admin')
  @AllowOwner({
    graphObjectType: 'collection',
    graphObjectCollection: 'service',
    graphIdFromParamKey: 'id',
    permission: 'sudo',
  })
  @UseGuards(BrokerOidcAuthGuard)
  async getServiceSecureInfo(@Param('id') id: string) {
    return this.service.getServiceSecureInfo(id);
  }

  @Get('service-instance/:id/details')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  async getServiceInstanceDetails(@Param('id') id: string) {
    return this.service.getServiceInstanceDetails(id);
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

  @Get(':collection/:id/combo')
  @UseGuards(BrokerCombinedAuthGuard)
  async getCollectionComboById(
    @Param('collection') collection: string,
    @Param('id') id: string,
  ) {
    return this.service.getCollectionComboById(
      this.parseCollectionApi(collection),
      id,
    );
  }

  @Post(':collection/:id/tags/:tag')
  @Roles('admin')
  @AllowOwner({
    graphObjectType: 'collection',
    graphObjectCollectionFromParamKey: 'collection',
    graphIdFromParamKey: 'id',
    permission: 'update',
    sudoMaskKey: 'sudo',
  })
  @UseGuards(BrokerOidcAuthGuard)
  async addTagToCollection(
    @Param('collection') collection: string,
    @Param('id') id: string,
    @Param('tag') tag: string,
  ) {
    return this.service.addTagToCollectionById(
      this.parseCollectionApi(collection),
      id,
      tag,
    );
  }

  @Put(':collection/:id/tags')
  @Roles('admin')
  @AllowOwner({
    graphObjectType: 'collection',
    graphObjectCollectionFromParamKey: 'collection',
    graphIdFromParamKey: 'id',
    permission: 'update',
    sudoMaskKey: 'sudo',
  })
  @UseGuards(BrokerOidcAuthGuard)
  async setTagsOnCollection(
    @Param('collection') collection: string,
    @Param('id') id: string,
    @Body() tags: string[],
  ) {
    return this.service.setTagsOnCollection(
      this.parseCollectionApi(collection),
      id,
      tags,
    );
  }

  @Delete(':collection/:id/tags/:tag')
  @Roles('admin')
  @AllowOwner({
    graphObjectType: 'collection',
    graphObjectCollectionFromParamKey: 'collection',
    graphIdFromParamKey: 'id',
    permission: 'update',
    sudoMaskKey: 'sudo',
  })
  @UseGuards(BrokerOidcAuthGuard)
  async deleteTagFromCollection(
    @Param('collection') collection: string,
    @Param('id') id: string,
    @Param('tag') tag: string,
  ) {
    return this.service.deleteTagFromCollectionById(
      this.parseCollectionApi(collection),
      id,
      tag,
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
    name: 'downstreamVertex',
    required: false,
  })
  @ApiQuery({
    name: 'vertexId',
    required: false,
  })
  @ApiQuery({
    name: 'q',
    required: false,
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    isArray: true,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
  })
  @ApiQuery({
    name: 'dir',
    required: false,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
  })
  @ApiQuery({
    name: 'id',
    required: false,
  })
  async searchCollection(
    @Param('collection') collection: string,
    @Query() query: CollectionSearchQuery,
  ) {
    return this.service.searchCollection(
      this.parseCollectionApi(collection),
      query.q,
      query.tags,
      query.upstreamVertex,
      query.downstreamVertex,
      query.id,
      query.vertexId,
      query.sort,
      query.dir,
      query.offset,
      query.limit,
    );
  }

  @Post(':collection/export')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiQuery({
    name: 'fields',
    required: false,
    isArray: true,
  })
  async exportCollection(
    @Param('collection') collection: string,
    @Query('fields')
    fields: string[] | undefined,
  ) {
    return this.service.exportCollection(
      this.parseCollectionApi(collection),
      fields,
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
      case 'server':
      case 'service':
      case 'repository':
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
