import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  MongoEntityManager,
  MongoEntityRepository,
  wrap,
} from '@mikro-orm/mongodb';
import { ObjectId } from 'mongodb';
import { EdgeEntity } from '../entity/edge.entity';
import { VertexEntity } from '../entity/vertex.entity';
import { GraphRepository } from '../interfaces/graph.repository';
import {
  CollectionConfigEntity,
  CollectionConfigInstanceDto,
} from '../entity/collection-config.entity';
import { arrayIdFixer, getRepositoryFromCollectionName } from './mongo.util';
import {
  BrokerAccountProjectMapDto,
  GraphDataResponseDto,
  GraphDeleteResponseDto,
} from '../dto/graph-data.dto';
import { VertexSearchDto } from '../dto/vertex.dto';
import { EdgeInsertDto } from '../dto/edge.dto';
import { COLLECTION_MAX_EMBEDDED } from '../../constants';
import { GraphProjectServicesResponseDto } from '../dto/graph-project-services-rest.dto';
import { GraphServerInstallsResponseDto } from '../dto/graph-server-installs-rest.dto';
import { ServiceDetailsResponseDto } from '../dto/service.dto';
import { ActionUtil } from '../../util/action.util';
import { GraphPermissionEntity } from '../entity/graph-permission.entity';
import { TimestampEmbeddable } from '../entity/timestamp.embeddable';
import { GraphDirectedCombo } from '../dto/collection-combo.dto';
import { GraphUpDownDto } from '../dto/graph-updown.dto';
import { ServiceInstanceDetailsResponseDto } from '../dto/service-instance.dto';
import {
  CollectionEntityUnion,
  CollectionNames,
} from '../entity/collection-entity-union.type';
import { UserPermissionDto } from '../dto/user-permission.dto';
import { GraphVertexConnections } from '../../persistence/dto/collection-combo.dto';
import { VertexPointerDto } from '../dto/vertex-pointer.dto';

@Injectable()
export class GraphMongoRepository implements GraphRepository {
  // private readonly dataSource: MongoEntityManager;

  constructor(
    @InjectRepository(CollectionConfigEntity)
    private readonly collectionConfigRepository: MongoEntityRepository<CollectionConfigEntity>,
    @InjectRepository(EdgeEntity)
    private readonly edgeRepository: MongoEntityRepository<EdgeEntity>,
    @InjectRepository(VertexEntity)
    private readonly vertexRepository: MongoEntityRepository<VertexEntity>,
    @InjectRepository(GraphPermissionEntity)
    private readonly permissionRepository: MongoEntityRepository<GraphPermissionEntity>,
    private readonly actionUtil: ActionUtil,
    private readonly dataSource: MongoEntityManager,
  ) {}

  public async getDataSlice(
    collections: string[],
  ): Promise<GraphDataResponseDto> {
    const configs = await this.collectionConfigRepository.findAll();
    const filteredConfigs = configs.filter(
      (config) => collections.indexOf(config.collection) !== -1,
    );
    const verticeArrs = await Promise.all(
      configs.map((config, category: number) => {
        if (collections.indexOf(config.collection) === -1) {
          return Promise.resolve([]);
        }
        return this.aggregateVertex(
          config.collection,
          category,
          config.index,
          false,
        );
      }),
    );

    const edges = await this.edgeRepository.find({
      is: { $in: filteredConfigs.map((config) => config.index) },
      it: { $in: filteredConfigs.map((config) => config.index) },
    });
    return {
      edges: edges.map((edge) => edge.toEdgeResponse(false)),
      vertices: [].concat(...verticeArrs),
      categories: configs.map((config) => {
        return {
          name: config.name,
        };
      }),
    };
  }

  public async getData(
    includeCollection: boolean,
  ): Promise<GraphDataResponseDto> {
    const configs = await this.collectionConfigRepository.findAll();
    const verticeArrs = await Promise.all(
      configs.map((config, category: number) => {
        return this.aggregateVertex(
          config.collection,
          category,
          config.index,
          includeCollection,
        );
      }),
    );

    const edges = await this.edgeRepository.findAll();
    return {
      edges: edges.map((edge) => edge.toEdgeResponse(false)),
      vertices: [].concat(...verticeArrs),
      categories: configs.map((config) => {
        return {
          name: config.name,
        };
      }),
    };
  }

  private async aggregateVertex(
    collection: string,
    category: number,
    index: number,
    includeData: boolean,
  ): Promise<any> {
    const aggregateArr: any = [{ $match: { collection } }];
    if (includeData) {
      aggregateArr.push({
        $lookup: {
          from: collection,
          localField: '_id',
          foreignField: 'vertex',
          as: 'data',
        },
      });
    }
    return this.vertexRepository
      .aggregate(aggregateArr)
      .then((vertices: any[]) =>
        vertices.map((vertex) => ({
          id: vertex._id,
          category,
          index,
          data:
            Array.isArray(vertex.data) && vertex.data.length > 0
              ? vertex.data[0]
              : undefined,
          name: vertex.name ?? vertex._id,
          collection: vertex.collection,
        })),
      );
  }

  private async getCollectionConfig(
    collection: string,
  ): Promise<CollectionConfigEntity | null> {
    return this.collectionConfigRepository.findOne({
      collection: collection as CollectionNames,
    });
  }

  public async getProjectServices(): Promise<
    GraphProjectServicesResponseDto[]
  > {
    const projectRepository = getRepositoryFromCollectionName(
      this.dataSource,
      'project',
    );

    return projectRepository
      .aggregate([
        {
          $lookup: {
            from: 'edge',
            localField: 'vertex',
            foreignField: 'source',
            as: 'services',
            pipeline: [
              { $match: { it: 2, name: 'component' } },
              {
                $lookup: {
                  from: 'service',
                  localField: 'target',
                  foreignField: 'vertex',
                  as: 'service',
                },
              },
              { $unwind: '$service' },
              { $replaceRoot: { newRoot: '$service' } },
              {
                $graphLookup: {
                  from: 'edge',
                  startWith: '$vertex',
                  connectFromField: 'target',
                  connectToField: 'source',
                  as: 'path',
                  maxDepth: 2,
                },
              },
              {
                $lookup: {
                  from: 'environment',
                  localField: 'path.target',
                  foreignField: 'vertex',
                  as: 'env',
                },
              },
              { $unset: ['path'] },
              { $set: { shortEnv: '$env.short', env: '$env.name' } },
            ],
          },
        },
      ])
      .then((array: any) => {
        arrayIdFixer(array);

        for (const datum of array) {
          if (datum.services) {
            for (const serv of datum.services) {
              serv.id = serv._id;
              delete serv._id;
            }
          }
        }
        return array;
      });
  }

  public async getServerInstalls(): Promise<GraphServerInstallsResponseDto[]> {
    const serverRepository = getRepositoryFromCollectionName(
      this.dataSource,
      'server',
    );
    return serverRepository
      .aggregate([
        {
          $lookup: {
            from: 'edge',
            localField: 'vertex',
            foreignField: 'target',
            as: 'instances',
            pipeline: [
              { $match: { is: 3, name: 'installation' } },
              {
                $lookup: {
                  from: 'serviceInstance',
                  localField: 'source',
                  foreignField: 'vertex',
                  as: 'instance',
                },
              },
              { $unwind: '$instance' },
              {
                $replaceRoot: {
                  newRoot: {
                    $mergeObjects: [{ edgeProp: '$prop' }, '$instance'],
                  },
                },
              },
              { $unset: 'actionHistory' },

              this.collectionLookup(
                'environment',
                { it: 0, name: 'deploy-type' },
                'forward',
                true,
                true,
              ),
              this.collectionLookup(
                'service',
                { is: 2, name: 'instance' },
                'reverse',
                true,
                true,
              ),
              { $unwind: '$environment' },
              { $unwind: '$service' },
            ],
          },
        },
      ])
      .then((array: any) => {
        arrayIdFixer(array);

        for (const datum of array) {
          if (datum.instances) {
            for (const instance of datum.instances) {
              instance.id = instance._id;
              delete instance._id;

              if (instance.environment) {
                instance.environment.id = instance.environment._id;
                delete instance.environment._id;
              }

              if (instance.service) {
                instance.service.id = instance.service._id;
                delete instance.service._id;
              }
            }
          }
        }
        return array;
      });
  }

  public async getServiceDetails(
    id: string,
  ): Promise<ServiceDetailsResponseDto> {
    const serviceRepository = getRepositoryFromCollectionName(
      this.dataSource,
      'service',
    );
    return serviceRepository
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        this.collectionLookup(
          'serviceInstance',
          { name: 'instance' },
          'forward',
          true,
          true,
          this.serviceInstanceDetailsAggregate(),
        ),
      ])
      .then((array: any) => {
        arrayIdFixer(array);
        const datum = array.length > 0 ? array[0] : null;
        if (datum) {
          arrayIdFixer(datum.serviceInstance);

          for (const instance of datum.serviceInstance) {
            this.fixServiceInstanceDetails(instance);
          }
        }
        return datum as ServiceDetailsResponseDto;
      });
  }

  public async getServiceInstanceDetails(
    id: string,
  ): Promise<ServiceInstanceDetailsResponseDto> {
    const serviceInstanceRepository = getRepositoryFromCollectionName(
      this.dataSource,
      'serviceInstance',
    );
    return serviceInstanceRepository
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        ...this.serviceInstanceDetailsAggregate(),
      ])
      .then((array: any) => {
        arrayIdFixer(array);
        const datum = array.length > 0 ? array[0] : null;
        return this.fixServiceInstanceDetails(datum);
      });
  }

  private serviceInstanceDetailsAggregate() {
    return [
      this.collectionLookup(
        'environment',
        { name: 'deploy-type' },
        'forward',
        true,
        true,
      ),
      this.collectionLookup(
        'server',
        { name: 'installation' },
        'forward',
        true,
        false,
      ),
      {
        $lookup: {
          from: 'intention',
          localField: 'action.intention',
          foreignField: '_id',
          as: 'intention',
        },
      },
      { $unwind: '$environment' },
      {
        $unwind: { path: '$intention', preserveNullAndEmptyArrays: true },
      },
    ];
  }

  private fixServiceInstanceDetails(
    datum: any,
  ): ServiceInstanceDetailsResponseDto {
    if (datum) {
      if (datum.environment) {
        datum.environment.id = datum.environment._id;
        delete datum.environment._id;
      }

      if (datum.server) {
        for (const server of datum.server) {
          server.edge.id = server.edge._id;
          delete server.edge._id;
          server.server.id = server.server._id;
          delete server.server._id;
        }
      }

      if (datum.intention) {
        const intention = datum.intention;
        intention.id = intention._id;
        delete intention._id;

        const actions = this.actionUtil.filterActions(
          intention.actions,
          this.actionUtil.actionToOptions(datum.action.action),
        );
        datum.action.source = {
          intention,
          action: actions.length === 1 ? actions[0] : undefined,
        };
        delete datum.intention;
      }
    }
    return datum as ServiceInstanceDetailsResponseDto;
  }

  public async getUserPermissions(id: string): Promise<UserPermissionDto> {
    const permissions = await this.permissionRepository.find({ name: 'user' });
    const configs = permissions.map((permission) => permission.data);
    const maxDepth = configs
      .map((config) => config.length)
      .reduce((pv, cv) => (cv > pv ? cv : pv), 1);
    return await this.vertexRepository
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $graphLookup: {
            from: 'edge',
            startWith: '$_id',
            connectFromField: 'target',
            connectToField: 'source',
            as: 'paths',
            depthField: 'depth',
            maxDepth,
          },
        },
      ])
      .then((upstreamArr: any[]) => {
        return this.collectPermissions(id, configs, upstreamArr[0].paths);
      });
  }

  private collectPermissions(
    id: string,
    configs: any[],
    paths: any[],
  ): UserPermissionDto {
    let ids = [];
    const matches: UserPermissionDto = {
      create: [],
      delete: [],
      sudo: [],
      update: [],
      approve: [],
    };
    for (const config of configs) {
      for (const [depth, depthConfig] of config.entries()) {
        // console.log(depth);
        // console.log(depthConfig);
        const filteredPaths = paths.filter(
          (path) =>
            path.depth === depth &&
            path.it === depthConfig.index &&
            path.name === depthConfig.name &&
            (depth === 0
              ? id === path.source.toString()
              : ids.indexOf(path.source.toString()) !== -1),
        );
        // console.log(filteredPaths);
        if (filteredPaths.length === 0) {
          break;
        }

        if (depthConfig.permissions) {
          ids = filteredPaths.map((path) => path.target.toString());
          // console.log(ids);
          // console.log(depthConfig.permissions);
          for (const permission of depthConfig.permissions) {
            matches[permission].push(...ids);
          }
        }
      }
    }
    return matches;
  }

  private collectionLookup(
    collection: string,
    edgeMatch: any,
    direction: 'forward' | 'reverse',
    unwind: boolean,
    replace: boolean,
    pipeline = [],
  ) {
    return {
      $lookup: {
        from: 'edge',
        localField: 'vertex',
        foreignField: direction === 'forward' ? 'source' : 'target',
        as: collection,
        pipeline: [
          { $match: edgeMatch },
          {
            $replaceWith: {
              edge: '$$ROOT',
            },
          },
          {
            $lookup: {
              from: collection,
              localField:
                direction === 'forward' ? 'edge.target' : 'edge.source',
              foreignField: 'vertex',
              as: collection,
            },
          },
          ...(unwind ? [{ $unwind: `$${collection}` }] : []),
          ...(replace && unwind
            ? [{ $replaceRoot: { newRoot: `$${collection}` } }]
            : []),
          ...(replace && !unwind
            ? [
                {
                  $replaceRoot: { newRoot: { [collection]: `$${collection}` } },
                },
              ]
            : []),
          ...pipeline,
        ],
      },
    };
  }

  // Edge
  public async addEdge(edgeInsert: EdgeInsertDto): Promise<EdgeEntity> {
    const sourceVertex = await this.getVertex(edgeInsert.source);
    const targetVertex = await this.getVertex(edgeInsert.target);
    const sourceConfig = await this.getCollectionConfig(
      sourceVertex.collection,
    );
    const targetConfig = await this.getCollectionConfig(
      targetVertex.collection,
    );
    if (
      sourceVertex === null ||
      targetVertex === null ||
      sourceConfig === null ||
      targetConfig === null
    ) {
      throw new Error('Unable to locate source and/or target');
    }
    const edgeConfig = sourceConfig.edges.find(
      (edgeConfig) => edgeConfig.name === edgeInsert.name,
    );

    // No edges to self
    if (edgeInsert.source === edgeInsert.target) {
      throw new Error('No edges to self');
    }
    const edge = EdgeEntity.upgradeInsertDto(edgeInsert);
    edge.is = sourceConfig.index;
    edge.it = targetConfig.index;
    edge.timestamps = TimestampEmbeddable.create();

    // No duplicate edges
    const relationCnt = await this.edgeRepository.count({
      source: edge.source,
      target: edge.target,
      name: edge.name,
    });
    if (relationCnt > 0) {
      throw new Error('No duplicate edges');
    }

    if (edgeConfig.relation === 'oneToOne') {
      // No additional edges
      const relationCnt = await this.edgeRepository.count({
        source: edge.source,
        name: edge.name,
      });
      if (relationCnt > 0) {
        throw new Error('One-to-one relation already exists');
      }
    }
    await this.dataSource.persistAndFlush(edge);
    // console.log(edge);
    if (!edge.id) {
      throw new Error();
    }

    return edge;
  }

  public async editEdge(id: string, edge: EdgeInsertDto): Promise<EdgeEntity> {
    const result = await this.edgeRepository.getCollection().updateOne(
      { _id: new ObjectId(id) },
      edge.prop
        ? {
            $set: {
              prop: edge.prop,
              'timestamps.updatedAt': new Date(),
            },
          }
        : {
            $set: {
              'timestamps.updatedAt': new Date(),
            },
            $unset: { prop: true },
          },
    );
    if (result.matchedCount !== 1) {
      throw new Error();
    }
    const rval = await this.getEdge(id);
    if (rval === null) {
      throw new Error();
    }

    return rval;
  }

  public async deleteEdge(
    id: string,
    cascade = true,
  ): Promise<GraphDeleteResponseDto> {
    const edge = await this.getEdge(id);
    const srcVertex = await this.getVertex(edge.source.toString());
    const config = await this.getCollectionConfig(srcVertex.collection);
    const edgeConfig = config.edges.find((ec) => ec.name === edge.name);
    const resp: GraphDeleteResponseDto = {
      edge: [id],
      vertex: [],
      adjacentVertex: [edge.source.toString(), edge.target.toString()],
    };
    if (
      edge === null ||
      srcVertex === null ||
      config === null ||
      edgeConfig === null
    ) {
      throw new Error('Unable to locate edge and/or source vertex');
    }
    if (
      edgeConfig.onDelete === 'cascade' &&
      cascade &&
      (await this.getEdgeTargetCount(edge.target.toString())) === 1
    ) {
      this.mergeGraphDeleteResponse(
        resp,
        await this.deleteVertex(edge.target.toString()),
      );
    }
    // console.log(`edgeRepository.delete(${id})`);
    await this.dataSource.removeAndFlush(edge);
    return resp;
  }

  public getEdge(id: string): Promise<EdgeEntity | null> {
    return this.edgeRepository.findOne({ _id: new ObjectId(id) });
  }

  public getEdgeByNameAndVertices(
    name: string,
    source: string,
    target: string,
  ): Promise<EdgeEntity> {
    return this.edgeRepository.findOne({
      name,
      source: new ObjectId(source),
      target: new ObjectId(target),
    });
  }

  public searchEdgesShallow(
    name?: string,
    source?: string,
    target?: string,
  ): Promise<EdgeEntity[]> {
    return this.edgeRepository.find({
      ...(name ? { name } : {}),
      ...(source ? { source: new ObjectId(source) } : {}),
      ...(target ? { target: new ObjectId(target) } : {}),
    });
  }

  public getEdgeSourceCount(source: string): Promise<number> {
    return this.edgeRepository.count({
      source: new ObjectId(source),
    });
  }

  public getEdgeTargetCount(target: string): Promise<number> {
    return this.edgeRepository.count({
      target: new ObjectId(target),
    });
  }

  public async getEdgeConfigByVertex(
    sourceId: string,
    targetCollection?: string,
    edgeName?: string,
  ): Promise<CollectionConfigInstanceDto[]> {
    const vertex = await this.getVertex(sourceId);
    if (!vertex) {
      throw new Error();
    }
    const sourceCollection = vertex.collection;
    return this.collectionConfigRepository
      .aggregate([
        { $match: { collection: sourceCollection } },
        { $unwind: '$edges' },
        { $set: { edge: '$edges', edges: '$$REMOVE' } },
        {
          $match: {
            ...(targetCollection
              ? { 'edge.collection': targetCollection }
              : {}),
            ...(edgeName ? { 'edge.name': edgeName } : {}),
          },
        },
        { $unwind: '$edge.prototypes' },
        {
          $set: {
            'edge.prototype': '$edge.prototypes',
            'edge.prototypes': '$$REMOVE',
          },
        },
        {
          $lookup: {
            from: 'edge',
            localField: 'edge.prototype.target',
            foreignField: 'target',
            as: 'instance',
            let: { edge: '$edge' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ['$source', new ObjectId(sourceId)],
                      },
                      { $eq: ['$name', '$$edge.name'] },
                    ],
                  },
                },
              },
            ],
          },
        },
        { $unwind: { path: '$instance', preserveNullAndEmptyArrays: true } },
      ])
      .then((array: any) => {
        arrayIdFixer(array);

        for (const datum of array) {
          if (datum.instance) {
            datum.instance.id = datum.instance._id;
            delete datum.instance._id;
          }
        }
        return array;
      });
  }

  // Vertex
  public async deleteVertex(id: string): Promise<GraphDeleteResponseDto> {
    const vertex = await this.getVertex(id);
    const resp: GraphDeleteResponseDto = {
      edge: [],
      vertex: [id],
      adjacentVertex: [],
    };
    if (vertex === null) {
      throw new Error();
    }
    const config = await this.getCollectionConfig(vertex.collection);
    if (config === null || !config.permissions.delete) {
      throw new Error();
    }

    // Find and delete all edges using vertex as a target
    const tarEdges = await this.edgeRepository.find({
      target: new ObjectId(vertex.id),
    });
    // console.log('tarEdges');
    // console.log(tarEdges);
    for (const edge of tarEdges) {
      try {
        this.mergeGraphDeleteResponse(
          resp,
          await this.deleteEdge(edge.id.toString(), false),
        );
      } catch (e) {
        // Ignore not found errors
      }
    }

    // Find and delete all edges using vertex as a source
    const srcEdges = await this.edgeRepository.find({
      source: new ObjectId(vertex.id),
    });
    // console.log('srcEdges');
    // console.log(srcEdges);
    for (const edge of srcEdges) {
      try {
        this.mergeGraphDeleteResponse(
          resp,
          await this.deleteEdge(edge.id.toString()),
        );
      } catch (e) {
        // Ignore not found errors
      }
    }

    // Delete associated collection
    const collectionRepository = getRepositoryFromCollectionName(
      this.dataSource,
      vertex.collection,
    );
    const entry = await collectionRepository.findOne({
      vertex: new ObjectId(vertex.id),
    });
    // console.log(entry);
    if (entry !== null) {
      await this.dataSource.removeAndFlush(entry);
    }
    // Delete vertex
    await this.vertexRepository.nativeDelete({ _id: new ObjectId(id) });
    return resp;
  }

  private mergeGraphDeleteResponse(
    target: GraphDeleteResponseDto,
    source: GraphDeleteResponseDto,
  ): void {
    target.edge.push(...source.edge);
    target.vertex.push(...source.vertex);
    target.adjacentVertex.push(...source.adjacentVertex);
  }

  public async addVertex(
    vertex: VertexEntity,
    collection: CollectionEntityUnion[typeof vertex.collection],
  ): Promise<VertexEntity> {
    vertex.timestamps = TimestampEmbeddable.create();

    await this.dataSource.persistAndFlush(vertex);
    if (!vertex.id) {
      throw new Error();
    }
    collection.vertex = vertex._id;
    // console.log(collection);
    try {
      await this.dataSource.persistAndFlush(collection);
    } catch (e: any) {
      // Delete orphan vertex
      await this.dataSource.removeAndFlush(vertex);
      throw e;
    }

    const rval = await this.getVertex(vertex.id);
    if (rval === null) {
      throw new Error();
    }
    return rval;
  }

  public async editVertex(
    id: string,
    vertex: VertexEntity,
    collection: CollectionEntityUnion[typeof vertex.collection],
    ignoreBlankFields = false,
  ): Promise<VertexEntity> {
    const curVertex = await this.getVertex(id);
    if (curVertex === null) {
      throw new Error();
    }
    const config = await this.getCollectionConfig(vertex.collection);
    const repository = getRepositoryFromCollectionName(
      this.dataSource,
      vertex.collection,
    );
    const collectionData = wrap(collection).toJSON();
    // Don't allow id, tag or vertex to be set
    delete collectionData.id;
    delete collectionData.vertex;
    delete collectionData.tags;

    const unsetFields = {};
    const pushFields = {};
    // Setup fields to push (arrays)
    for (const fkey of Object.keys(collectionData)) {
      if (
        config.fields[fkey] &&
        config.fields[fkey].type === 'embeddedDocArray'
      ) {
        pushFields[fkey] = {
          $each: collectionData[fkey],
          $slice: -COLLECTION_MAX_EMBEDDED,
        };
        delete collectionData[fkey];
      }
    }
    // Setup fields to unset
    for (const fkey of Object.keys(collectionData)) {
      if (config.fields[fkey] === undefined) {
        unsetFields[fkey] = '';
      } else if (config.fields[fkey].type === 'embeddedDoc') {
        // delete collectionData[fkey];
      }
    }
    if (!ignoreBlankFields) {
      for (const fkey of Object.keys(config.fields)) {
        if (
          pushFields[fkey] === undefined &&
          collectionData[fkey] === undefined &&
          config.fields[fkey].type !== 'embeddedDoc' &&
          config.fields[fkey].type !== 'embeddedDocArray'
        ) {
          unsetFields[fkey] = '';
        }
      }
    }
    // Update collection
    const collResult = await repository.getCollection().updateOne(
      { vertex: new ObjectId(id) },
      {
        $set: collectionData,
        $setOnInsert: {
          vertex: new ObjectId(id),
        },
        $push: pushFields,
        $unset: unsetFields,
      },
      { upsert: true },
    );

    if (collResult.matchedCount !== 1 && collResult.upsertedCount !== 1) {
      throw new Error();
    }
    // console.log(vertex);
    const vertResult = await this.vertexRepository.getCollection().updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: vertex.name,
          'timestamps.updatedAt': new Date(),
          ...(vertex.prop ? { prop: vertex.prop } : {}),
        },
        $unset: {
          ...(!vertex.prop ? { prop: true } : {}),
        },
      },
    );
    // console.log(vertResult);
    if (vertResult.matchedCount !== 1) {
      throw new Error();
    }
    const rval = await this.getVertex(id);
    if (rval === null) {
      throw new Error();
    }
    return rval;
  }

  public getVertex(id: string): Promise<VertexEntity | null> {
    return this.vertexRepository.findOne({ _id: new ObjectId(id) });
  }

  public async getVertexByName(
    collection: keyof CollectionEntityUnion,
    name: string,
  ): Promise<VertexEntity | null> {
    return this.vertexRepository.findOne({ name, collection });
  }

  public async getVertexConnections(
    id: string,
  ): Promise<GraphVertexConnections> {
    const vertexId = new ObjectId(id);
    return {
      downstream: (await this.edgeRepository
        .aggregate([
          { $match: { source: vertexId } },
          {
            $replaceRoot: { newRoot: { ['edge']: `$$ROOT` } },
          },
          {
            $lookup: {
              from: 'vertex',
              localField: 'edge.target',
              foreignField: '_id',
              as: 'vertex',
            },
          },
          { $unwind: '$vertex' },
        ])
        .then((arr: any[]) => {
          return arr.map((combo) => {
            combo.edge.id = combo.edge._id;
            combo.vertex.id = combo.vertex._id;
            delete combo.edge._id;
            delete combo.vertex._id;
            return combo;
          });
        })) as unknown as GraphDirectedCombo[],
      upstream: (await this.edgeRepository
        .aggregate([
          { $match: { target: vertexId } },
          {
            $replaceRoot: { newRoot: { ['edge']: `$$ROOT` } },
          },
          {
            $lookup: {
              from: 'vertex',
              localField: 'edge.source',
              foreignField: '_id',
              as: 'vertex',
            },
          },
          { $unwind: '$vertex' },
        ])
        .then((arr: any[]) => {
          return arr.map((combo) => {
            combo.edge.id = combo.edge._id;
            combo.vertex.id = combo.vertex._id;
            delete combo.edge._id;
            delete combo.vertex._id;
            return combo;
          });
        })) as unknown as GraphDirectedCombo[],
    };
  }

  public async getVertexInfo(id: string) {
    return {
      incoming: await this.getEdgeTargetCount(id),
      outgoing: await this.getEdgeSourceCount(id),
    };
  }

  public async searchVertex(
    collection: string,
    edgeName?: string,
    edgeTarget?: string,
  ): Promise<VertexSearchDto[]> {
    const pipeline: any[] = [{ $match: { collection } }];
    if (edgeName !== undefined && edgeTarget !== undefined) {
      pipeline.push(
        {
          $lookup: {
            from: 'edge',
            localField: '_id',
            foreignField: 'source',
            as: 'edge',
            pipeline: [
              { $match: { name: edgeName, target: new ObjectId(edgeTarget) } },
            ],
          },
        },
        { $unwind: '$edge' },
      );
    }
    pipeline.push(
      { $addFields: { id: '$_id', 'edge.id': '$edge._id' } },
      { $unset: ['_id', 'edge._id'] },
    );
    return this.vertexRepository.aggregate(
      pipeline,
    ) as unknown as VertexSearchDto[];
  }

  public async getUserConnectedVertex(id: string): Promise<string[]> {
    const configs = await this.collectionConfigRepository.find({
      'permissions.filter': true,
    } as any);
    const canFilterConnected = configs.map((config) => config.index);

    return this.vertexRepository
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $graphLookup: {
            from: 'edge',
            startWith: '$_id',
            connectFromField: 'target',
            connectToField: 'source',
            as: 'edge',
            restrictSearchWithMatch: {
              it: { $in: canFilterConnected },
            },
          },
        },
      ])
      .then((connectedResult: any[]) => {
        if (connectedResult.length === 0) {
          return [];
        }
        const connectedVertex = connectedResult[0].edge.map((edge) =>
          edge.target.toString(),
        );
        connectedVertex.push(id);
        return connectedVertex;
      });
  }

  public async getVertexByParentIdAndName(
    collection: string,
    parentId: string,
    name: string,
  ): Promise<VertexEntity | null> {
    const vertices = await this.edgeRepository.aggregate([
      { $match: { source: new ObjectId(parentId) } },
      {
        $lookup: {
          from: 'vertex',
          localField: 'target',
          foreignField: '_id',
          as: 'vertices',
          pipeline: [{ $match: { name, collection } }],
        },
      },
      { $unwind: '$vertices' },
      { $replaceRoot: { newRoot: '$vertices' } },
    ]);
    if (vertices.length === 1) {
      vertices[0].id = (vertices[0] as any)._id;
      delete (vertices[0] as any)._id;
      return vertices[0] as unknown as VertexEntity;
    }
  }

  public async getUpstreamVertex<T extends VertexPointerDto>(
    id: string,
    index: number,
    matchEdgeNames: string[] | null = null,
  ): Promise<GraphUpDownDto<T>[]> {
    const config = await this.collectionConfigRepository.findOne({
      index,
    });
    if (config === null) {
      throw new Error();
    }
    return this.vertexRepository
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $graphLookup: {
            from: 'edge',
            startWith: '$_id',
            connectFromField: 'source',
            connectToField: 'target',
            as: 'edge',
          },
        },
        { $unwind: '$edge' },
        {
          $match: {
            'edge.is': index,
            ...(matchEdgeNames
              ? {
                  'edge.name': { $in: matchEdgeNames },
                }
              : {}),
          },
        },
        {
          $lookup: {
            from: config.collection,
            localField: 'edge.source',
            foreignField: 'vertex',
            as: 'collection',
          },
        },
        { $unwind: '$collection' },
        {
          $lookup: {
            from: 'vertex',
            localField: 'edge.target',
            foreignField: '_id',
            as: 'vertex',
          },
        },
        { $unwind: '$vertex' },
      ])
      .then((streamArr: any[]) => {
        return streamArr.map((stream) => {
          stream.collection.id = stream.collection._id;
          delete stream.collection._id;

          stream.edge.id = stream.edge._id;
          delete stream.edge._id;
          stream.vertex.id = stream.vertex._id;
          delete stream.vertex._id;
          return {
            collection: stream.collection,
            edge: stream.edge,
            vertex: stream.vertex,
          };
        });
      });
  }

  public async getDownstreamVertex<T extends VertexPointerDto>(
    id: string,
    index: number,
    maxDepth: number,
  ): Promise<GraphUpDownDto<T>[]> {
    const config = await this.collectionConfigRepository.findOne({
      index,
    });
    if (config === null) {
      throw new Error();
    }
    return this.vertexRepository
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $graphLookup: {
            from: 'edge',
            startWith: '$_id',
            connectFromField: 'target',
            connectToField: 'source',
            as: 'edge',
            maxDepth,
          },
        },
        { $unwind: '$edge' },
        {
          $match: {
            'edge.it': index,
          },
        },
        {
          $lookup: {
            from: config.collection,
            localField: 'edge.target',
            foreignField: 'vertex',
            as: 'collection',
          },
        },
        { $unwind: '$collection' },
        {
          $lookup: {
            from: 'vertex',
            localField: 'edge.source',
            foreignField: '_id',
            as: 'vertex',
          },
        },
        { $unwind: '$vertex' },
      ])
      .then((streamArr: any[]) => {
        return streamArr.map((stream) => {
          stream.collection.id = stream.collection._id;
          delete stream.collection._id;

          stream.edge.id = stream.edge._id;
          delete stream.edge._id;
          stream.vertex.id = stream.vertex._id;
          delete stream.vertex._id;
          return {
            collection: stream.collection,
            edge: stream.edge,
            vertex: stream.vertex,
          };
        });
      });
  }

  public async getBrokerAccountServices(
    id: string,
  ): Promise<BrokerAccountProjectMapDto> {
    const serviceConfig = await this.getCollectionConfig('service');
    const projectConfig = await this.getCollectionConfig('project');
    if (serviceConfig === null || projectConfig === null) {
      throw new Error();
    }
    return this.vertexRepository
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $graphLookup: {
            from: 'edge',
            startWith: '$_id',
            connectFromField: 'target',
            connectToField: 'source',
            as: 'path',
            maxDepth: 2,
            restrictSearchWithMatch: {
              it: { $in: [serviceConfig.index, projectConfig.index] },
            },
          },
        },
        { $unwind: { path: '$path' } },
        { $match: { 'path.it': serviceConfig.index } },
        {
          $lookup: {
            from: 'vertex',
            localField: 'path.target',
            foreignField: '_id',
            as: 'service',
          },
        },
        {
          $lookup: {
            from: 'edge',
            localField: 'path.target',
            foreignField: 'target',
            as: 'project_edge',
            pipeline: [{ $match: { is: projectConfig.index } }],
          },
        },
        {
          $lookup: {
            from: 'vertex',
            localField: 'project_edge.source',
            foreignField: '_id',
            as: 'project',
          },
        },
      ])
      .then((servProjArr: any[]) => {
        const acc: BrokerAccountProjectMapDto = {};
        for (const servProj of servProjArr) {
          if (!acc[servProj.project[0].name]) {
            acc[servProj.project[0].name] = {
              name: servProj.project[0].name,
              services: [],
            };
          }
          for (const service of servProj.service) {
            acc[servProj.project[0].name].services.push(service.name);
          }
        }
        return acc;
      });
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  public vertexTypeahead(
    text: string,
    collections?: string[],
    offset?: number,
    limit?: number,
  ): Promise<any> {
    throw new Error('Method not implemented.');
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  public reindexCache(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}
