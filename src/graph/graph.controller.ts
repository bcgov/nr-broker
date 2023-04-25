import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BrokerOidcAuthGuard } from '../auth/broker-oidc-auth.guard';
import { GraphService } from './graph.service';
import { EdgeDto } from '../persistence/dto/edge.dto';
import { VertexCollectionDto } from '../persistence/dto/vertex.dto';

@Controller({
  path: 'graph',
  version: '1',
})
export class GraphController {
  constructor(private graph: GraphService) {}

  @Get('data')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  getData(@Query('collection') collection: string) {
    return this.graph.getData(collection === 'true');
  }

  @Post('edge')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  addEdge(@Req() request: Request, @Body() edge: EdgeDto) {
    return this.graph.addEdge(request, edge);
  }

  @Get('edge/:id')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  getEdge(@Param('id') id: string) {
    return this.graph.getEdge(id);
  }

  @Delete('edge/:id')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  deleteEdge(@Req() request: Request, @Param('id') id: string) {
    return this.graph.deleteEdge(request, id);
  }

  @Post('vertex')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  addVertex(@Req() request: Request, @Body() vertex: VertexCollectionDto) {
    return this.graph.addVertex(request, vertex);
  }

  @Put('vertex/:id')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  editVertex(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() vertex: VertexCollectionDto,
  ) {
    return this.graph.editVertex(request, id, vertex);
  }

  @Get('vertex/:id')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  getVertex(@Param('id') id: string) {
    return this.graph.getVertex(id);
  }

  @Delete('vertex/:id')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  deleteVertex(@Req() request: Request, @Param('id') id: string) {
    return this.graph.deleteVertex(request, id);
  }
  /*
  @Get('project')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  async getProjectByVertexId(@Query('vertex') id: string) {
    return await this.graph.getProjectByVertexId(id);
  }

  @Get('service')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  async getServiceByVertexId(@Query('vertex') id: string) {
    return await this.graph.getServiceByVertexId(id);
  }

  @Get('environment')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  async getEnvironmentByVertexId(@Query('vertex') id: string) {
    return await this.graph.getEnvironmentByVertexId(id);
  }

  @Get('service-instance')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  async getServiceInstanceByVertexId(@Query('vertex') id: string) {
    return await this.graph.getServiceInstanceByVertexId(id);
  }
  */
}
