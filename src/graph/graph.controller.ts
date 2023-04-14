import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BrokerAuthGuard } from '../auth/broker-auth.guard';
import { GraphService } from './graph.service';
import { EdgeDto } from '../persistence/dto/edge.dto';
import { VertexDto } from 'src/persistence/dto/vertex.dto';

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

  @Get('config')
  //@UseGuards(BrokerAuthGuard)
  //@ApiBearerAuth()
  getCollectionConfig() {
    return this.graph.getCollectionConfig();
  }

  @Post('edge')
  //@UseGuards(BrokerAuthGuard)
  //@ApiBearerAuth()
  addEdge(@Body() edge: EdgeDto) {
    return this.graph.addEdge(edge);
  }

  @Get('edge/:id')
  //@UseGuards(BrokerAuthGuard)
  //@ApiBearerAuth()
  getEdge(@Param('id') id: string) {
    return this.graph.getEdge(id);
  }

  @Delete('edge/:id')
  //@UseGuards(BrokerAuthGuard)
  //@ApiBearerAuth()
  deleteEdge(@Param('id') id: string) {
    return this.graph.deleteEdge(id);
  }

  @Post('vertex')
  //@UseGuards(BrokerAuthGuard)
  //@ApiBearerAuth()
  addVertex(@Body() vertex: VertexDto) {
    return this.graph.addVertex(vertex);
  }

  @Get('vertex/:id')
  //@UseGuards(BrokerAuthGuard)
  //@ApiBearerAuth()
  getVertex(@Param('id') id: string) {
    return this.graph.getVertex(id);
  }

  @Delete('vertex/:id')
  //@UseGuards(BrokerAuthGuard)
  //@ApiBearerAuth()
  deleteVertex(@Param('id') id: string) {
    return this.graph.deleteVertex(id);
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
