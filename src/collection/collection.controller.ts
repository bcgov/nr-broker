import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserDto } from '../intention/dto/user.dto';
import { CollectionService } from './collection.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BrokerOidcAuthGuard } from '../auth/broker-oidc-auth.guard';
import { ProjectDto } from '../persistence/dto/project.dto';
import { EnvironmentDto } from '../persistence/dto/environment.dto';
import { ServiceInstanceDto } from '../persistence/dto/service-instance.dto';
import { ServiceDto } from '../persistence/dto/service.dto';
import { CollectionConfigDto } from '../persistence/dto/collection-config.dto';

@Controller({
  path: 'collection',
  version: '1',
})
export class CollectionController {
  constructor(private service: CollectionService) {}

  @Get('user/self')
  @UseGuards(BrokerOidcAuthGuard)
  user(@Request() req: any): UserDto {
    return req.user;
  }

  @Get('config')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  getCollectionConfig(): Promise<CollectionConfigDto[]> {
    return this.service.getCollectionConfig();
  }

  @Get('environment')
  @UseGuards(BrokerOidcAuthGuard)
  async getEnvironmentByVertexId(
    @Query('vertex') id: string,
  ): Promise<EnvironmentDto> {
    return this.service.getCollectionByVertexId('environment', id);
  }

  @Get('project')
  @UseGuards(BrokerOidcAuthGuard)
  async getProjectByVertexId(@Query('vertex') id: string): Promise<ProjectDto> {
    return this.service.getCollectionByVertexId('project', id);
  }

  @Get('service')
  @UseGuards(BrokerOidcAuthGuard)
  async getServiceByVertexId(@Query('vertex') id: string): Promise<ServiceDto> {
    return this.service.getCollectionByVertexId('service', id);
  }

  @Get('service-instance')
  @UseGuards(BrokerOidcAuthGuard)
  async getServiceInstanceByVertexId(
    @Query('vertex') id: string,
  ): Promise<ServiceInstanceDto> {
    return this.service.getCollectionByVertexId('serviceInstance', id);
  }
}
