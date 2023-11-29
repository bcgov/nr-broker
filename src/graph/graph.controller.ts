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
  UsePipes,
  ValidationPipe,
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
import { CollectionDtoUnion } from '../persistence/dto/collection-dto-union.type';
import { AllowBodyValue } from '../allow-body-value.decorator';
import { AllowEmptyEdges } from '../allow-empty-edges.decorator';

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
  @AllowEmptyEdges('team')
  @AllowOwner({
    graphObjectType: 'vertex',
    graphIdFromBodyPath: 'target',
  })
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  addEdge(@Req() request: Request, @Body() edge: EdgeInsertDto) {
    return this.graph.addEdge(request, edge);
  }

  @Post('edge/find')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  getEdgeByNameAndVertices(
    @Query('name') name: string,
    @Query('source') source: string,
    @Query('target') target: string,
  ) {
    return this.graph.getEdgeByNameAndVertices(name, source, target);
  }

  @Post('edge/shallow-search')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({
    name: 'source',
    required: false,
  })
  @ApiQuery({
    name: 'target',
    required: false,
  })
  @ApiQuery({
    name: 'map',
    required: false,
  })
  searchEdgesShallow(
    @Query('name') name: string,
    @Query('map') map: 'id' | 'source' | 'target' | '' = '',
    @Query('source') source?: string,
    @Query('target') target?: string,
  ) {
    return this.graph.searchEdgesShallow(name, map, source, target);
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
  @AllowBodyValue([
    {
      path: 'collection',
      value: 'team',
    },
  ])
  @UseGuards(BrokerOidcAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
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
    @Query('collection') collection: keyof CollectionDtoUnion,
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
  @UsePipes(new ValidationPipe({ transform: true }))
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
  @AllowOwner({
    graphObjectType: 'vertex',
    graphIdFromParamKey: 'id',
  })
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
