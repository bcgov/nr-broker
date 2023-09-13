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
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BrokerOidcAuthGuard } from '../auth/broker-oidc-auth.guard';
import { GraphService } from './graph.service';
import { Roles } from '../roles.decorator';
import { BrokerCombinedAuthGuard } from '../auth/broker-combined-auth.guard';
import { EdgeInsertDto } from '../persistence/dto/edge-rest.dto';
import { VertexInsertDto } from '../persistence/dto/vertex-rest.dto';
import { AllowOwner } from '../allow-owner.decorator';

@Controller({
  path: 'graph',
  version: '1',
})
export class GraphController {
  constructor(private readonly graph: GraphService) {}

  @Get('data')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  getData(@Query('collection') collection: string) {
    return this.graph.getData(collection === 'true');
  }

  @Post('edge')
  @Roles('admin')
  @AllowOwner({
    graphObjectType: 'vertex',
    graphIdFromBodyPath: 'target',
  })
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  addEdge(@Req() request: Request, @Body() edge: EdgeInsertDto) {
    return this.graph.addEdge(request, edge);
  }

  @Post('edge/search')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  searchEdge(
    @Query('name') name: string,
    @Query('sourceId') sourceId: string,
    @Query('targetId') targetId: string,
  ) {
    return this.graph.getEdgeByNameAndVertices(name, sourceId, targetId);
  }

  @Put('edge/:id')
  @Roles('admin')
  @AllowOwner({
    graphObjectType: 'edge',
    graphIdFromBodyPath: 'id',
  })
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  editEdge(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() edge: EdgeInsertDto,
  ) {
    return this.graph.editEdge(request, id, edge);
  }

  @Get('edge/:id')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  getEdge(@Param('id') id: string) {
    return this.graph.getEdge(id);
  }

  @Delete('edge/:id')
  @Roles('admin')
  @AllowOwner({
    graphObjectType: 'edge',
    graphIdFromParamKey: 'id',
  })
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  deleteEdge(@Req() request: Request, @Param('id') id: string) {
    return this.graph.deleteEdge(request, id);
  }

  @Post('vertex')
  @Roles('admin')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  addVertex(@Req() request: Request, @Body() vertex: VertexInsertDto) {
    return this.graph.addVertex(request, vertex);
  }

  @Post('vertex/search')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({
    name: 'typeahead',
    required: false,
  })
  @ApiQuery({
    name: 'edgeName',
    required: false,
  })
  @ApiQuery({
    name: 'edgeTarget',
    required: false,
  })
  searchVertex(
    @Query('collection') collection: string,
    @Query('typeahead') typeahead?: string,
    @Query('edgeName') edgeName?: string,
    @Query('edgeTarget') edgeTarget?: string,
  ) {
    return this.graph.searchVertex(collection, typeahead, edgeName, edgeTarget);
  }

  @Put('vertex/:id')
  @Roles('admin')
  @AllowOwner({
    graphObjectType: 'vertex',
    graphIdFromParamKey: 'id',
  })
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  editVertex(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() vertex: VertexInsertDto,
  ) {
    return this.graph.editVertex(request, id, vertex);
  }

  @Get('vertex/:id')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  getVertex(@Param('id') id: string) {
    return this.graph.getVertex(id);
  }

  @Delete('vertex/:id')
  @Roles('admin')
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  deleteVertex(@Req() request: Request, @Param('id') id: string) {
    return this.graph.deleteVertex(request, id);
  }

  @Post('vertex/:id/upstream/:index')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({
    name: 'matchEdgeNames',
    required: false,
  })
  getUpstreamVertex(
    @Param('id') id: string,
    @Param('index') index: string,
    @Query('matchEdgeNames') matchEdgeNames: string,
  ) {
    return this.graph.getUpstreamVertex(
      id,
      Number.parseInt(index),
      matchEdgeNames ? matchEdgeNames.split(',') : null,
    );
  }
}
