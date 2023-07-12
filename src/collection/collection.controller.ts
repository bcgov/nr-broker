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
import { EnvironmentDto } from '../persistence/dto/environment.dto';
import { ProjectDto } from '../persistence/dto/project.dto';
import { ServiceInstanceDto } from '../persistence/dto/service-instance.dto';
import { ServiceDto } from '../persistence/dto/service.dto';
import { TeamDto } from '../persistence/dto/team.dto';
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

  @Get('environment')
  @UseGuards(BrokerCombinedAuthGuard)
  async getEnvironmentByVertexId(
    @Query('vertex') vertexId: string,
  ): Promise<EnvironmentDto> {
    return this.service.getCollectionByVertexId('environment', vertexId);
  }

  @Get('project')
  @UseGuards(BrokerCombinedAuthGuard)
  async getProjectByVertexId(
    @Query('vertex') vertexId: string,
  ): Promise<ProjectDto> {
    return this.service.getCollectionByVertexId('project', vertexId);
  }

  @Get('service')
  @UseGuards(BrokerCombinedAuthGuard)
  async getServiceByVertexId(
    @Query('vertex') vertexId: string,
  ): Promise<ServiceDto> {
    return this.service.getCollectionByVertexId('service', vertexId);
  }

  @Get('service-instance')
  @UseGuards(BrokerCombinedAuthGuard)
  async getServiceInstanceByVertexId(
    @Query('vertex') vertexId: string,
  ): Promise<ServiceInstanceDto> {
    return this.service.getCollectionByVertexId('serviceInstance', vertexId);
  }

  @Get('team')
  @UseGuards(BrokerCombinedAuthGuard)
  async getTeamByVertexId(@Query('vertex') vertexId: string): Promise<TeamDto> {
    return this.service.getCollectionByVertexId('team', vertexId);
  }

  @Get('user')
  @UseGuards(BrokerCombinedAuthGuard)
  async getUserByVertexId(@Query('vertex') vertexId: string): Promise<UserDto> {
    return this.service.getCollectionByVertexId('user', vertexId);
  }
}
