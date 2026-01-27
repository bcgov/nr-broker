import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType, SCHEMA_FIELD_TYPE } from 'redis';

import { GraphRepository } from '../interfaces/graph.repository';
import { BrokerAccountEntity } from '../entity/broker-account.entity';
import { EdgeInsertDto } from '../dto/edge.dto';
import { EdgeEntity } from '../entity/edge.entity';
import { EnvironmentEntity } from '../entity/environment.entity';
import {
  GraphDataResponseDto,
  BrokerAccountProjectMapDto,
  GraphDeleteResponseDto,
} from '../dto/graph-data.dto';
import { ProjectEntity } from '../entity/project.entity';
import { ServiceInstanceEntity } from '../entity/service-instance.entity';
import { ServiceEntity } from '../entity/service.entity';
import { TeamEntity } from '../entity/team.entity';
import { UserEntity } from '../entity/user.entity';
import { VertexInfoDto } from '../dto/vertex-info.dto';
import { VertexSearchDto } from '../dto/vertex.dto';
import { VertexEntity } from '../entity/vertex.entity';
import { GraphMongoRepository } from '../mongo/graph-mongo.repository';
import { CollectionMongoRepository } from '../mongo/collection-mongo.repository';
import { CollectionConfigEntity } from '../entity/collection-config.entity';
import { CollectionConfigInstanceDto } from '../dto/collection-config.dto';
import {
  PERSISTENCE_CACHE_KEY_CONFIG,
  PERSISTENCE_CACHE_KEY_GRAPH,
} from '../persistence.constants';
import { PersistenceRedisUtilService } from '../persistence-redis-util.service';
import { GraphTypeaheadResult } from '../../graph/dto/graph-typeahead-result.dto';
import { GraphProjectServicesResponseDto } from '../dto/graph-project-services.dto';
import { GraphServerInstallsResponseDto } from '../dto/graph-server-installs.dto';
import { ServiceDetailsResponseDto, ServiceDto } from '../dto/service.dto';
import { GraphVertexConnections } from '../dto/collection-combo.dto';
import { GraphUpDownDto } from '../dto/graph-updown.dto';
import { ServiceInstanceDetailsResponseDto } from '../dto/service-instance.dto';
import { InjectRepository } from '@mikro-orm/nestjs';
import { MongoEntityRepository, ObjectId } from '@mikro-orm/mongodb';
import {
  CollectionEntityUnion,
  CollectionNames,
  CollectionNameStringEnum,
} from '../entity/collection-entity-union.type';
import { UserPermissionDto } from '../dto/user-permission.dto';
import { VertexPointerDto } from '../dto/vertex-pointer.dto';
import { CollectionWatchVertexDto } from '../dto/collection-watch.dto';
import { CollectionWatchEntity } from '../entity/collection-watch.entity';

@Injectable()
export class GraphRedisRepository implements GraphRepository {
  constructor(
    private readonly repo: GraphMongoRepository,
    private readonly collection: CollectionMongoRepository,
    private readonly util: PersistenceRedisUtilService,
    @InjectRepository(CollectionConfigEntity)
    private readonly collectionConfigRepository: MongoEntityRepository<CollectionConfigEntity>,
    @Inject('REDIS_CLIENT') private client: RedisClientType,
  ) {}

  public async getData(
    includeCollection: boolean,
  ): Promise<GraphDataResponseDto> {
    return this.repo.getData(includeCollection);
  }

  public async getDataSlice(
    collections: string[],
  ): Promise<GraphDataResponseDto> {
    return this.repo.getDataSlice(collections);
  }

  public async getProjectServices(): Promise<
    GraphProjectServicesResponseDto[]
  > {
    return this.repo.getProjectServices();
  }

  public async getServerInstalls(): Promise<GraphServerInstallsResponseDto[]> {
    return this.repo.getServerInstalls();
  }

  public async getServiceDetails(
    id: string,
  ): Promise<ServiceDetailsResponseDto> {
    return this.repo.getServiceDetails(id);
  }

  public async getServiceInstanceDetails(
    id: string,
  ): Promise<ServiceInstanceDetailsResponseDto> {
    return this.repo.getServiceInstanceDetails(id);
  }

  public async getUserPermissions(id: string): Promise<UserPermissionDto> {
    return this.repo.getUserPermissions(id);
  }

  public getTeamUserPermissions(
    teamVertexId: string,
    roleName: string,
  ): Promise<UserPermissionDto> {
    return this.repo.getTeamUserPermissions(teamVertexId, roleName);
  }

  public async addEdge(edge: EdgeInsertDto): Promise<EdgeEntity> {
    const returnVal = await this.repo.addEdge(edge);
    this.invalidateCache();
    return returnVal;
  }

  public async editEdge(id: string, edge: EdgeInsertDto): Promise<EdgeEntity> {
    const returnVal = await this.repo.editEdge(id, edge);
    this.invalidateCache();
    return returnVal;
  }

  public async deleteEdge(id: string): Promise<GraphDeleteResponseDto> {
    const returnVal = await this.repo.deleteEdge(id);
    this.invalidateCache();
    return returnVal;
  }

  public getEdge(id: string): Promise<EdgeEntity> {
    return this.repo.getEdge(id);
  }

  public getEdgeByNameAndVertices(
    name: string,
    source: string,
    target: string,
  ): Promise<EdgeEntity> {
    return this.repo.getEdgeByNameAndVertices(name, source, target);
  }

  public searchEdgesShallow(
    name?: string,
    source?: string,
    target?: string,
  ): Promise<EdgeEntity[]> {
    return this.repo.searchEdgesShallow(name, source, target);
  }

  public getEdgeConfigByVertex(
    sourceId: string,
    targetCollection?: string,
    edgeName?: string,
  ): Promise<CollectionConfigInstanceDto[]> {
    return this.repo.getEdgeConfigByVertex(
      sourceId,
      targetCollection,
      edgeName,
    );
  }

  public async addVertex(
    vertex: VertexEntity,
    collection:
      | BrokerAccountEntity
      | EnvironmentEntity
      | ProjectEntity
      | ServiceInstanceEntity
      | ServiceEntity
      | TeamEntity
      | UserEntity,
  ): Promise<VertexEntity> {
    const returnVal = await this.repo.addVertex(vertex, collection);
    this.upsertVertexTypeaheadIndex(returnVal);
    this.invalidateCache();
    return returnVal;
  }

  public async editVertex(
    id: string,
    vertex: VertexEntity,
    collection:
      | BrokerAccountEntity
      | EnvironmentEntity
      | ProjectEntity
      | ServiceInstanceEntity
      | ServiceEntity
      | TeamEntity
      | UserEntity,
    ignoreBlankFields?: boolean,
  ): Promise<VertexEntity> {
    const returnVal = await this.repo.editVertex(
      id,
      vertex,
      collection,
      ignoreBlankFields,
    );
    this.upsertVertexTypeaheadIndex(returnVal);
    this.invalidateCache();
    return returnVal;
  }

  public async deleteVertex(id: string): Promise<GraphDeleteResponseDto> {
    const vertex = await this.getVertex(id);
    const returnVal = await this.repo.deleteVertex(id);
    this.removeVertexTypeaheadIndex(vertex);
    this.invalidateCache();
    return returnVal;
  }

  public getVertex(id: string): Promise<VertexEntity> {
    return this.repo.getVertex(id);
  }

  public getVertexByName(
    collection: keyof CollectionEntityUnion,
    name: string,
  ): Promise<VertexEntity> {
    return this.repo.getVertexByName(collection, name);
  }

  public getVertexConnections(id: string): Promise<GraphVertexConnections> {
    return this.repo.getVertexConnections(id);
  }

  public getVertexInfo(id: string): Promise<VertexInfoDto> {
    return this.repo.getVertexInfo(id);
  }

  public searchVertex(
    collection: keyof CollectionEntityUnion,
    edgeName?: string,
    edgeTarget?: string,
  ): Promise<VertexSearchDto[]> {
    return this.repo.searchVertex(collection, edgeName, edgeTarget);
  }

  public getUserConnectedVertex(id: string): Promise<string[]> {
    return this.repo.getUserConnectedVertex(id);
  }

  public getVertexByParentIdAndName(
    collection: keyof CollectionEntityUnion,
    parentId: string,
    name: string,
  ): Promise<VertexEntity> {
    return this.repo.getVertexByParentIdAndName(collection, parentId, name);
  }

  public getUpstreamVertex<T extends VertexPointerDto>(
    id: string,
    index: number,
    matchEdgeNames: string[],
    allowRestrictedEdges?: boolean,
  ): Promise<GraphUpDownDto<T>[]> {
    return this.repo.getUpstreamVertex(id, index, matchEdgeNames, allowRestrictedEdges);
  }

  public getDownstreamVertex<T extends VertexPointerDto>(
    id: string,
    index: number,
    maxDepth: number,
    allowRestrictedEdges?: boolean,
  ): Promise<GraphUpDownDto<T>[]> {
    return this.repo.getDownstreamVertex(id, index, maxDepth, allowRestrictedEdges);
  }

  public getBrokerAccountServices(
    id: string,
  ): Promise<BrokerAccountProjectMapDto> {
    return this.repo.getBrokerAccountServices(id);
  }

  public getTargetServices(id: string): Promise<GraphUpDownDto<ServiceDto>[]> {
    return this.repo.getTargetServices(id);
  }

  public async vertexTypeahead<T extends keyof CollectionEntityUnion>(
    text: string,
    collections?: T[],
    offset?: number,
    limit?: number,
  ): Promise<GraphTypeaheadResult> {
    const collectionClause = !!collections
      ? `(@collection:{${collections
        .map((collection) => this.util.escapeRedisStr(collection))
        .join('|')}}) `
      : '';

    const data = await this.client.ft.search(
      'idx:collection_json',
      `${collectionClause}(@text:(*${this.util.escapeRedisStr(text)}*))`,
      {
        LIMIT: { from: offset ? offset : 0, size: limit ? limit : 10 },
      },
    );

    return {
      meta: {
        total: data.total,
      },
      data: data.documents.map((doc) => {
        return {
          id: doc.value.id as string,
          collection: doc.value.collection as CollectionNames,
          name: doc.value.name as string,
          ...(doc.value.parentName
            ? { parentName: doc.value.parentName as string }
            : {}),
          // index: doc.id,
        };
      }),
    };

    // FT.SEARCH idx:collection_json "(@collection:{user|environment|service}) (@text: (*arc*))"
  }

  // FT.CREATE idx:collection_json
  // ON JSON
  //   PREFIX 1 "collection_json:"
  // SCHEMA
  //   $.text AS text TEXT NOSTEM
  //   $.id AS id TAG
  //   $.collection AS collection TAG
  // SORTABLE
  //   $.name AS name TAG

  public async reindexCache() {
    // console.log('reindexCache');
    try {
      await this.client.ft.dropIndex('idx:collection_json', { DD: true });
    } catch (e: any) {
      // ignore -- may just be first time creating index
    }
    await this.client.ft.create(
      'idx:collection_json',
      {
        '$.text': {
          type: SCHEMA_FIELD_TYPE.TEXT,
          AS: 'text',
          WITHSUFFIXTRIE: true,
        },
        '$.id': {
          type: SCHEMA_FIELD_TYPE.TAG,
          AS: 'id',
        },
        '$.collection': {
          type: SCHEMA_FIELD_TYPE.TAG,
          AS: 'collection',
        },
        '$.name': {
          type: SCHEMA_FIELD_TYPE.TAG,
          AS: 'name',
          SORTABLE: true,
        },
      },
      {
        ON: 'JSON',
        PREFIX: 'collection_json:',
      },
    );
    const data = await this.getData(false);
    for (const vertex of data.vertices) {
      await this.upsertVertexTypeaheadIndex(vertex as unknown as VertexEntity);
    }

    // Invalidate cached data as well
    await this.invalidateCache();

    return true;
  }

  public async saveWatch(
    watch: CollectionWatchVertexDto,
  ): Promise<CollectionWatchEntity> {
    return this.repo.saveWatch(watch);
  }

  public async getWatchesForVertex(
    vertexId: string,
    userId: string,
  ): Promise<CollectionWatchEntity | null> {
    return this.repo.getWatchesForVertex(vertexId, userId);
  }

  public async getWatchers(
    id: string,
    channel: string,
    event: string,
  ): Promise<ObjectId[]> {
    return this.repo.getWatchers(id, channel, event);
  }

  public async getDefaultWatchesForVertex(
    vertexId: string,
    userId: string,
  ): Promise<any[]> {
    return this.repo.getDefaultWatchesForVertex(vertexId, userId);
  }

  private async getCollectionConfig(
    collection: string,
  ): Promise<CollectionConfigEntity | null> {
    return this.collectionConfigRepository.findOne({
      collection: collection as CollectionNameStringEnum,
    });
  }

  private async upsertVertexTypeaheadIndex(vertex: VertexEntity) {
    const collection = await this.collection.getCollectionByVertexId(
      vertex.collection,
      vertex.id.toString(),
    );
    if (!collection) {
      // Skip. Data issue.
      return;
    }
    const config = await this.getCollectionConfig(vertex.collection);
    const textValues = [];
    const parentName = await this.getParentVertexName(config, vertex);

    for (const key of Object.keys(config.fields)) {
      const field = config.fields[key];
      const value = collection[key];
      if (!value) {
        continue;
      }
      if (field.type === 'string') {
        textValues.push(value);
        if (this.util.escapeRedisStr(value) !== value) {
          textValues.push(this.util.escapeRedisStr(value));
        }
      }
    }

    if (textValues.indexOf(vertex.name) === -1) {
      textValues.push(vertex.name);
    }

    this.client.json.set(this.toClientJsonKey(vertex), '$', {
      text: textValues,
      id: vertex.id.toString(),
      name: vertex.name,
      collection: vertex.collection,
      ...(parentName ? { parentName } : {}),
    });
  }

  private async getParentVertexName(
    config: CollectionConfigEntity,
    vertex: VertexEntity,
  ) {
    if (config.parent?.edgeName) {
      const edges = await this.repo.searchEdgesShallow(
        config.parent.edgeName,
        null,
        vertex.id.toString(),
      );
      if (edges.length === 1) {
        const parentVertex = await this.repo.getVertex(
          edges[0].source.toString(),
        );
        if (parentVertex) {
          return parentVertex.name;
        }
      }
    }
    return null;
  }

  private async removeVertexTypeaheadIndex(vertex: VertexEntity) {
    this.client.json.del(this.toClientJsonKey(vertex));
  }

  private toClientJsonKey(vertex: VertexEntity) {
    return `collection_json:${vertex.collection}:${vertex.id.toString()}`;
  }

  private async invalidateCache() {
    // console.log('invalidate: cache');
    const keys = await this.client.keys(`${PERSISTENCE_CACHE_KEY_GRAPH}-*`);
    const suffixDelArr = keys.map((key) => this.client.del(key));

    return Promise.all([
      ...suffixDelArr,
      this.client.del(PERSISTENCE_CACHE_KEY_GRAPH),
      this.client.del(PERSISTENCE_CACHE_KEY_CONFIG),
    ]);
  }
}
