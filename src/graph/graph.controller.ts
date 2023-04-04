import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BrokerAuthGuard } from '../auth/broker-auth.guard';
import { GraphService } from './graph.service';

@Controller({
  path: 'graph',
  version: '1',
})
export class GraphController {
  constructor(private graph: GraphService) {}

  @Get('data')
  //@UseGuards(BrokerAuthGuard)
  //@ApiBearerAuth()
  getData(@Query('collection') collection: string) {
    return this.graph.getData(collection === 'true');
  }

  @Get('project')
  //@UseGuards(BrokerAuthGuard)
  //@ApiBearerAuth()
  async getProjectByVertexId(@Query('vertex') id: string) {
    return await this.graph.getProjectByVertexId(id);
  }

  @Get('service')
  //@UseGuards(BrokerAuthGuard)
  //@ApiBearerAuth()
  async getServiceByVertexId(@Query('vertex') id: string) {
    return await this.graph.getServiceByVertexId(id);
  }

  @Get('environment')
  //@UseGuards(BrokerAuthGuard)
  //@ApiBearerAuth()
  async getEnvironmentByVertexId(@Query('vertex') id: string) {
    return await this.graph.getEnvironmentByVertexId(id);
  }

  @Get('service-instance')
  //@UseGuards(BrokerAuthGuard)
  //@ApiBearerAuth()
  async getServiceInstanceByVertexId(@Query('vertex') id: string) {
    return await this.graph.getServiceInstanceByVertexId(id);
  }
}
