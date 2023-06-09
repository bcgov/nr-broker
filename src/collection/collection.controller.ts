import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CollectionService } from './collection.service';
import { ApiBearerAuth, ApiOAuth2 } from '@nestjs/swagger';
import { BrokerOidcAuthGuard } from '../auth/broker-oidc-auth.guard';
import { AccountDto } from '../persistence/dto/account.dto';
import { ProjectDto } from '../persistence/dto/project.dto';
import { EnvironmentDto } from '../persistence/dto/environment.dto';
import { ServiceInstanceDto } from '../persistence/dto/service-instance.dto';
import { ServiceDto } from '../persistence/dto/service.dto';
import { CollectionConfigDto } from '../persistence/dto/collection-config.dto';
import { UserDto } from '../persistence/dto/user.dto';
import { Request as ExpressRequest } from 'express';
import { BrokerCombinedAuthGuard } from '../auth/broker-combined-auth.guard';
import { AccountService } from './account.service';

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

  @Get('account')
  @UseGuards(BrokerCombinedAuthGuard)
  async getAccountByVertexId(@Query('vertex') id: string): Promise<AccountDto> {
    return this.service.getCollectionByVertexId('account', id);
  }

  @Post('account/:id/token')
  @UseGuards(BrokerOidcAuthGuard)
  async generateAccountToken(
    @Param('id') id: string,
    @Request() req: ExpressRequest,
  ) {
    return this.accountService.generateAccountToken(
      req,
      id,
      (req.user as any).userinfo.idir_user_guid,
    );
  }

  @Get('environment')
  @UseGuards(BrokerCombinedAuthGuard)
  async getEnvironmentByVertexId(
    @Query('vertex') id: string,
  ): Promise<EnvironmentDto> {
    return this.service.getCollectionByVertexId('environment', id);
  }

  @Get('project')
  @UseGuards(BrokerCombinedAuthGuard)
  async getProjectByVertexId(@Query('vertex') id: string): Promise<ProjectDto> {
    return this.service.getCollectionByVertexId('project', id);
  }

  @Get('service')
  @UseGuards(BrokerCombinedAuthGuard)
  async getServiceByVertexId(@Query('vertex') id: string): Promise<ServiceDto> {
    return this.service.getCollectionByVertexId('service', id);
  }

  @Get('service-instance')
  @UseGuards(BrokerCombinedAuthGuard)
  async getServiceInstanceByVertexId(
    @Query('vertex') id: string,
  ): Promise<ServiceInstanceDto> {
    return this.service.getCollectionByVertexId('serviceInstance', id);
  }

  @Get('user')
  @UseGuards(BrokerCombinedAuthGuard)
  async getUserByVertexId(@Query('vertex') id: string): Promise<UserDto> {
    return this.service.getCollectionByVertexId('user', id);
  }
}
