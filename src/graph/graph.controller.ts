import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  MessageEvent,
  Req,
  Sse,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';

import { BrokerOidcAuthGuard } from '../auth/broker-oidc-auth.guard';
import { GraphService } from './graph.service';
import { Roles } from '../roles.decorator';
import { BrokerCombinedAuthGuard } from '../auth/broker-combined-auth.guard';
import { EdgeInsertDto } from '../persistence/dto/edge-rest.dto';
import { VertexInsertDto } from '../persistence/dto/vertex-rest.dto';
import { AllowOwner } from '../allow-owner.decorator';
import {
  CollectionDtoUnion,
  CollectionNames,
} from '../persistence/dto/collection-dto-union.type';
import { AllowBodyValue } from '../allow-body-value.decorator';
import { AllowEmptyEdges } from '../allow-empty-edges.decorator';
import { PersistenceCacheInterceptor } from '../persistence/persistence-cache.interceptor';
import { PersistenceCacheKey } from '../persistence/persistence-cache-key.decorator';
import { GraphTypeaheadQuery } from './dto/graph-typeahead-query.dto';
import { PERSISTENCE_CACHE_KEY_GRAPH } from '../persistence/persistence.constants';
import { RedisService } from '../redis/redis.service';
import { REDIS_PUBSUB } from '../constants';

@Controller({
  path: 'graph',
  version: '1',
})
export class GraphController {
  constructor(
    private readonly graph: GraphService,
    private readonly redis: RedisService,
  ) {}

  @Get('data')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  @PersistenceCacheKey(PERSISTENCE_CACHE_KEY_GRAPH)
  @UseInterceptors(PersistenceCacheInterceptor)
  getData() {
    return this.graph.getData(false);
  }

  @Get('data/project-services')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  getProjectServices() {
    return this.graph.getProjectServices();
  }

  @Get('data/server-installs')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  getServerInstalls() {
    return this.graph.getServerInstalls();
  }

  @Get('data/collection')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  getDataCollection() {
    return this.graph.getData(true);
  }

  @Sse('events')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  events(): Observable<MessageEvent> {
    return this.redis.getEventSource(REDIS_PUBSUB.GRAPH);
  }

  @Post('typeahead')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({
    name: 'collections',
    type: [String],
    required: false,
    isArray: true,
  })
  getVertexTypeahead(@Query() query: GraphTypeaheadQuery) {
    return this.graph.vertexTypeahead(
      query.q,
      (!query.collections || Array.isArray(query.collections)
        ? query.collections
        : [query.collections]) as CollectionNames[],
    );
  }

  @Post('reindex-cache')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  @Roles('admin')
  cacheReset() {
    return this.graph.reindexCache();
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
    name: 'edgeName',
    required: false,
  })
  @ApiQuery({
    name: 'edgeTarget',
    required: false,
  })
  searchVertex(
    @Query('collection') collection: keyof CollectionDtoUnion,
    @Query('edgeName') edgeName?: string,
    @Query('edgeTarget') edgeTarget?: string,
  ) {
    return this.graph.searchVertex(collection, edgeName, edgeTarget);
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

  @Get('vertex/:id/edge-config')
  @UseGuards(BrokerCombinedAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({
    name: 'targetCollection',
    required: false,
  })
  @ApiQuery({
    name: 'edgeName',
    required: false,
  })
  getVertexEdgeConfig(
    @Param('id') id: string,
    @Query('targetCollection') targetCollection: string,
    @Query('edgeName') edgeName: string,
  ) {
    return this.graph.getEdgeConfigByVertex(id, targetCollection, edgeName);
  }
}
