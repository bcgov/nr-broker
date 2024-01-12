import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { RedisClientType, SchemaFieldTypes } from 'redis';

import { GraphRepository } from '../interfaces/graph.repository';
import { BrokerAccountDto } from '../dto/broker-account.dto';
import { CollectionDtoUnion } from '../dto/collection-dto-union.type';
import { EdgeInsertDto } from '../dto/edge-rest.dto';
import { EdgeDto } from '../dto/edge.dto';
import { EnvironmentDto } from '../dto/environment.dto';
import {
  GraphDataResponseDto,
  UpstreamResponseDto,
  BrokerAccountProjectMapDto,
} from '../dto/graph-data.dto';
import { ProjectDto } from '../dto/project.dto';
import { ServiceInstanceDto } from '../dto/service-instance.dto';
import { ServiceDto } from '../dto/service.dto';
import { TeamDto } from '../dto/team.dto';
import { UserDto } from '../dto/user.dto';
import { VertexInfoDto } from '../dto/vertex-info.dto';
import { VertexPointerDto } from '../dto/vertex-pointer.dto';
import { VertexSearchDto } from '../dto/vertex-rest.dto';
import { VertexDto } from '../dto/vertex.dto';
import { GraphMongoRepository } from '../mongo/graph-mongo.repository';
import { CollectionMongoRepository } from '../mongo/collection-mongo.repository';
import { CollectionConfigDto } from '../dto/collection-config.dto';
import {
  PERSISTENCE_CACHE_KEY_CONFIG,
  PERSISTENCE_CACHE_KEY_GRAPH,
} from '../persistence.constants';
import { PersistenceRedisUtilService } from '../persistence-redis-util.service';
import { GraphTypeaheadResult } from '../../graph/dto/graph-typeahead-result.dto';

@Injectable()
export class GraphRedisRepository implements GraphRepository {
  constructor(
    private readonly repo: GraphMongoRepository,
    private readonly collection: CollectionMongoRepository,
    private readonly util: PersistenceRedisUtilService,
    @InjectRepository(CollectionConfigDto)
    private readonly collectionConfigRepository: MongoRepository<CollectionConfigDto>,
    @Inject('REDIS_CLIENT') private client: RedisClientType,
  ) {}

  public async getData(
    includeCollection: boolean,
  ): Promise<GraphDataResponseDto> {
    return this.repo.getData(includeCollection);
  }

  public async addEdge(edge: EdgeInsertDto): Promise<EdgeDto> {
    const returnVal = await this.repo.addEdge(edge);
    this.invalidateCache();
    return returnVal;
  }

  public async editEdge(id: string, edge: EdgeInsertDto): Promise<EdgeDto> {
    const returnVal = await this.repo.editEdge(id, edge);
    this.invalidateCache();
    return returnVal;
  }

  public async deleteEdge(id: string): Promise<boolean> {
    const returnVal = await this.repo.deleteEdge(id);
    this.invalidateCache();
    return returnVal;
  }

  public getEdge(id: string): Promise<EdgeDto> {
    return this.repo.getEdge(id);
  }

  public getEdgeByNameAndVertices(
    name: string,
    source: string,
    target: string,
  ): Promise<EdgeDto> {
    return this.repo.getEdgeByNameAndVertices(name, source, target);
  }

  public searchEdgesShallow(
    name: string,
    source?: string,
    target?: string,
  ): Promise<EdgeDto[]> {
    return this.repo.searchEdgesShallow(name, source, target);
  }

  public async addVertex(
    vertex: VertexDto,
    collection:
      | BrokerAccountDto
      | EnvironmentDto
      | ProjectDto
      | ServiceInstanceDto
      | ServiceDto
      | TeamDto
      | UserDto,
  ): Promise<VertexDto> {
    const returnVal = await this.repo.addVertex(vertex, collection);
    this.upsertVertexTypeaheadIndex(returnVal);
    this.invalidateCache();
    return returnVal;
  }

  public async editVertex(
    id: string,
    vertex: VertexDto,
    collection:
      | BrokerAccountDto
      | EnvironmentDto
      | ProjectDto
      | ServiceInstanceDto
      | ServiceDto
      | TeamDto
      | UserDto,
    ignoreBlankFields?: boolean,
  ): Promise<VertexDto> {
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

  public async deleteVertex(id: string): Promise<boolean> {
    const vertex = await this.getVertex(id);
    const returnVal = await this.repo.deleteVertex(id);
    this.removeVertexTypeaheadIndex(vertex);
    this.invalidateCache();
    return returnVal;
  }

  public getVertex(id: string): Promise<VertexDto> {
    return this.repo.getVertex(id);
  }

  public getVertexByName(
    collection: keyof CollectionDtoUnion,
    name: string,
  ): Promise<VertexDto> {
    return this.repo.getVertexByName(collection, name);
  }

  public getVertexInfo(id: string): Promise<VertexInfoDto> {
    return this.repo.getVertexInfo(id);
  }

  public searchVertex(
    collection: keyof CollectionDtoUnion,
    edgeName?: string,
    edgeTarget?: string,
  ): Promise<VertexSearchDto[]> {
    return this.repo.searchVertex(collection, edgeName, edgeTarget);
  }

  public getVertexByParentIdAndName(
    collection: keyof CollectionDtoUnion,
    parentId: string,
    name: string,
  ): Promise<VertexDto> {
    return this.repo.getVertexByParentIdAndName(collection, parentId, name);
  }

  public getUpstreamVertex<T extends VertexPointerDto>(
    id: string,
    index: number,
    matchEdgeNames: string[],
  ): Promise<UpstreamResponseDto<T>[]> {
    return this.repo.getUpstreamVertex(id, index, matchEdgeNames);
  }

  public getDownstreamVertex<T extends VertexPointerDto>(
    id: string,
    index: number,
    maxDepth: number,
  ): Promise<UpstreamResponseDto<T>[]> {
    return this.repo.getDownstreamVertex(id, index, maxDepth);
  }

  public getBrokerAccountServices(
    id: string,
  ): Promise<BrokerAccountProjectMapDto> {
    return this.repo.getBrokerAccountServices(id);
  }

  public async vertexTypeahead<T extends keyof CollectionDtoUnion>(
    text: string,
    collections?: T[],
    offset?: number,
    limit?: number,
  ): Promise<GraphTypeaheadResult> {
    const collectionClause = !!collections
      ? `(@collection:{${collections
          .map((collection) => this.util.escapeRedisStr(collection))
          .join('|')}) `
      : '';

    const data = await this.client.ft.search(
      'idx:collection_json',
      `${collectionClause}(@text: (*${this.util.escapeRedisStr(text)}*))`,
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
          collection: doc.value.collection as string,
          name: doc.value.name as string,
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
          type: SchemaFieldTypes.TEXT,
          AS: 'text',
        },
        '$.id': {
          type: SchemaFieldTypes.TAG,
          AS: 'id',
        },
        '$.collection': {
          type: SchemaFieldTypes.TAG,
          AS: 'collection',
        },
        '$.name': {
          type: SchemaFieldTypes.TAG,
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
      await this.upsertVertexTypeaheadIndex(vertex as unknown as VertexDto);
    }

    // Invalidate cached data as well
    await this.invalidateCache();

    return true;
  }

  private async getCollectionConfig(
    collection: string,
  ): Promise<CollectionConfigDto | null> {
    return this.collectionConfigRepository.findOne({
      where: { collection },
    });
  }

  private async upsertVertexTypeaheadIndex(vertex: VertexDto) {
    const collection = await this.collection.getCollectionByVertexId(
      vertex.collection,
      vertex.id.toString(),
    );
    const config = await this.getCollectionConfig(vertex.collection);
    const textValues = [];

    for (const key of Object.keys(config.fields)) {
      const field = config.fields[key];
      if (!collection[key]) {
        continue;
      }
      if (field.type === 'string') {
        textValues.push(collection[key]);
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
    });
  }

  private async removeVertexTypeaheadIndex(vertex: VertexDto) {
    this.client.json.del(this.toClientJsonKey(vertex));
  }

  private toClientJsonKey(vertex: VertexDto) {
    return `collection_json:${vertex.collection}:${vertex.id.toString()}`;
  }

  private invalidateCache() {
    // console.log('invalidate: cache');
    return Promise.all([
      this.client.del(PERSISTENCE_CACHE_KEY_GRAPH),
      this.client.del(PERSISTENCE_CACHE_KEY_CONFIG),
    ]);
  }
}
