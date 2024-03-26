import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MongoRepository, ObjectLiteral } from 'typeorm';
import { ObjectId } from 'mongodb';
import { EdgeDto } from '../dto/edge.dto';
import { VertexDto } from '../dto/vertex.dto';
import { GraphRepository } from '../interfaces/graph.repository';
import {
  CollectionConfigDto,
  CollectionConfigInstanceDto,
} from '../dto/collection-config.dto';
import { getRepositoryFromCollectionName } from './mongo.util';
import {
  BrokerAccountProjectMapDto,
  GraphDataResponseDto,
  GraphDeleteResponseDto,
  UpstreamResponseDto,
} from '../dto/graph-data.dto';
import { VertexSearchDto } from '../dto/vertex-rest.dto';
import { EdgeInsertDto } from '../dto/edge-rest.dto';
import { COLLECTION_MAX_EMBEDDED } from '../../constants';
import { CollectionDtoUnion } from '../dto/collection-dto-union.type';
import { VertexPointerDto } from '../dto/vertex-pointer.dto';
import { GraphProjectServicesResponseDto } from '../dto/graph-project-services-rest.dto';

@Injectable()
export class GraphMongoRepository implements GraphRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CollectionConfigDto)
    private readonly collectionConfigRepository: MongoRepository<CollectionConfigDto>,
    @InjectRepository(EdgeDto)
    private readonly edgeRepository: MongoRepository<EdgeDto>,
    @InjectRepository(VertexDto)
    private readonly vertexRepository: MongoRepository<VertexDto>,
  ) {}

  public async getData(
    includeCollection: boolean,
  ): Promise<GraphDataResponseDto> {
    const configs = await this.collectionConfigRepository.find();
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

    const edges = await this.edgeRepository.find();
    // console.log(edges);
    return {
      edges: edges.map((edge) => edge.toEdgeResponse()),
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
      .toArray()
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
          prop: vertex.prop,
          collection: vertex.collection,
        })),
      );
  }

  private async getCollectionConfig(
    collection: string,
  ): Promise<CollectionConfigDto | null> {
    return this.collectionConfigRepository.findOne({
      where: { collection },
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
      .toArray()
      .then((array: any) => {
        this.arrayIdFixer(array);

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

  // Edge
  public async addEdge(edgeInsert: EdgeInsertDto): Promise<EdgeDto> {
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
      throw new Error();
    }
    const edgeConfig = sourceConfig.edges.find(
      (edgeConfig) => edgeConfig.name === edgeInsert.name,
    );

    // No edges to self
    if (edgeInsert.source === edgeInsert.target) {
      throw new Error();
    }
    const edge = EdgeDto.upgradeInsertDto(edgeInsert);
    edge.is = sourceConfig.index;
    edge.it = targetConfig.index;

    // No duplicate edges
    const relationCnt = await this.edgeRepository.count({
      source: edge.source,
      target: edge.target,
      name: edge.name,
    });
    if (relationCnt > 0) {
      throw new Error();
    }

    if (edgeConfig.relation === 'oneToOne') {
      // No additional edges
      const relationCnt = await this.edgeRepository.count({
        source: edge.source,
        name: edge.name,
      });
      if (relationCnt > 0) {
        throw new Error();
      }
    }
    const result = await this.edgeRepository.insertOne(edge);
    if (!result.acknowledged) {
      throw new Error();
    }
    const rval = await this.getEdge(result.insertedId.toString());
    if (rval === null) {
      throw new Error();
    }

    return rval;
  }

  public async editEdge(id: string, edge: EdgeInsertDto): Promise<EdgeDto> {
    const result = await this.edgeRepository.updateOne(
      { _id: new ObjectId(id) },
      edge.prop
        ? {
            $set: {
              prop: edge.prop,
            },
          }
        : { $unset: { prop: true } },
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
    };
    if (
      edge === null ||
      srcVertex === null ||
      config === null ||
      edgeConfig === null
    ) {
      throw new Error();
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
    const result = await this.edgeRepository.delete(id);
    if (result.affected !== 1) {
      throw new Error();
    }
    return resp;
  }

  public getEdge(id: string): Promise<EdgeDto | null> {
    return this.edgeRepository.findOne({
      where: { _id: new ObjectId(id) },
    });
  }

  public getEdgeByNameAndVertices(
    name: string,
    source: string,
    target: string,
  ): Promise<EdgeDto> {
    return this.edgeRepository.findOne({
      where: {
        name,
        source: new ObjectId(source),
        target: new ObjectId(target),
      },
    });
  }

  public async searchEdgesShallow(
    name: string,
    source?: string,
    target?: string,
  ): Promise<EdgeDto[]> {
    return this.edgeRepository.find({
      where: {
        name,
        ...(source ? { source: new ObjectId(source) } : {}),
        ...(target ? { target: new ObjectId(target) } : {}),
      },
    });
  }

  public getEdgeSourceCount(source: string): Promise<number> {
    return this.edgeRepository.count({
      source,
    });
  }

  public getEdgeTargetCount(target: string): Promise<number> {
    return this.edgeRepository.count({
      target,
    });
  }

  public async getEdgeConfigByVertex(
    sourceId: string,
    targetCollection?: string,
    edgeName?: string,
  ): Promise<CollectionConfigInstanceDto[]> {
    const vertex = await this.getVertex(sourceId);
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
      .toArray()
      .then((array: any) => {
        this.arrayIdFixer(array);

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
      where: { target: new ObjectId(vertex.id) },
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
      where: { source: new ObjectId(vertex.id) },
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
      where: { vertex: new ObjectId(vertex.id) },
    });
    // console.log(entry);
    if (entry !== null) {
      await collectionRepository.delete(entry.id);
    }
    // Delete vertex
    await this.vertexRepository.delete(id);
    return resp;
  }

  private mergeGraphDeleteResponse(
    target: GraphDeleteResponseDto,
    source: GraphDeleteResponseDto,
  ): void {
    target.edge.push(...source.edge);
    target.vertex.push(...source.vertex);
  }

  public async addVertex(
    vertex: VertexDto,
    collection: CollectionDtoUnion[typeof vertex.collection],
  ): Promise<VertexDto> {
    const repository = getRepositoryFromCollectionName(
      this.dataSource,
      vertex.collection,
    );

    const vertResult = await this.vertexRepository.insertOne(vertex);
    if (!vertResult.acknowledged) {
      throw new Error();
    }
    collection.vertex = vertResult.insertedId;
    // console.log(collection);
    try {
      const collResult = await repository.insertOne(collection);
      // console.log(collResult);
      if (!collResult.acknowledged) {
        throw new Error();
      }
    } catch (e: any) {
      // Delete orphan vertex
      await this.deleteVertex(vertResult.insertedId.toString());
      throw e;
    }

    const rval = await this.getVertex(vertResult.insertedId.toString());
    if (rval === null) {
      throw new Error();
    }
    return rval;
  }

  public async editVertex(
    id: string,
    vertex: VertexDto,
    collection: CollectionDtoUnion[typeof vertex.collection],
    ignoreBlankFields = false,
  ): Promise<VertexDto> {
    const curVertex = await this.getVertex(id);
    if (curVertex === null) {
      throw new Error();
    }
    const config = await this.getCollectionConfig(vertex.collection);
    const repository = getRepositoryFromCollectionName(
      this.dataSource,
      vertex.collection,
    );
    // Don't allow vertex or id to be set
    delete collection.id;
    delete collection.vertex;

    const unsetFields = {};
    const pushFields = {};
    // Setup fields to push (arrays)
    for (const fkey of Object.keys(collection)) {
      if (config.fields[fkey].type === 'embeddedDocArray') {
        pushFields[fkey] = {
          $each: collection[fkey],
          $slice: -COLLECTION_MAX_EMBEDDED,
        };
        delete collection[fkey];
      }
    }
    // Setup fields to unset
    for (const fkey of Object.keys(collection)) {
      if (config.fields[fkey] === undefined) {
        unsetFields[fkey] = '';
      }
      if (config.fields[fkey].type === 'embeddedDoc') {
        // delete collection[fkey];
      }
    }
    if (!ignoreBlankFields) {
      for (const fkey of Object.keys(config.fields)) {
        if (
          pushFields[fkey] === undefined &&
          collection[fkey] === undefined &&
          config.fields[fkey].type !== 'embeddedDoc' &&
          config.fields[fkey].type !== 'embeddedDocArray'
        ) {
          unsetFields[fkey] = '';
        }
      }
    }

    // Update collection
    const collResult = await repository.updateOne(
      { vertex: new ObjectId(id) },
      {
        $set: collection,
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
    const vertResult = await this.vertexRepository.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: vertex.name,
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

  public getVertex(id: string): Promise<VertexDto | null> {
    return this.vertexRepository.findOne({
      where: { _id: new ObjectId(id) },
    });
  }

  public async getVertexByName(
    collection: keyof CollectionDtoUnion,
    name: string,
  ): Promise<VertexDto | null> {
    return this.vertexRepository.findOne({
      where: { name, collection },
    });
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
    const pipeline: ObjectLiteral[] = [{ $match: { collection } }];
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
    return this.vertexRepository
      .aggregate(pipeline)
      .toArray() as unknown as VertexSearchDto[];
  }

  public async getVertexByParentIdAndName(
    collection: string,
    parentId: string,
    name: string,
  ): Promise<VertexDto | null> {
    const vertices = await this.edgeRepository
      .aggregate([
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
      ])
      .toArray();
    if (vertices.length === 1) {
      vertices[0].id = (vertices[0] as any)._id;
      delete (vertices[0] as any)._id;
      return vertices[0] as unknown as VertexDto;
    }
  }

  public async getUpstreamVertex<T extends VertexPointerDto>(
    id: string,
    index: number,
    matchEdgeNames: string[] | null = null,
  ): Promise<UpstreamResponseDto<T>[]> {
    const config = await this.collectionConfigRepository.findOne({
      where: {
        index,
      },
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
            as: 'path',
          },
        },
        { $unwind: { path: '$path' } },
        {
          $match: {
            'path.is': index,
            ...(matchEdgeNames
              ? {
                  'path.name': { $in: matchEdgeNames },
                }
              : {}),
          },
        },
        {
          $lookup: {
            from: config.collection,
            localField: 'path.source',
            foreignField: 'vertex',
            as: 'collection',
          },
        },
      ])
      .toArray()
      .then((upstreamArr: any[]) => {
        return upstreamArr.map((upstream) => {
          const collection = upstream.collection[0];
          collection.id = collection._id;
          delete collection._id;

          const path = upstream.path;
          path.id = path._id;
          delete path._id;
          return {
            collection,
            path,
          };
        });
      });
  }

  public async getDownstreamVertex<T extends VertexPointerDto>(
    id: string,
    index: number,
    maxDepth: number,
  ): Promise<UpstreamResponseDto<T>[]> {
    const config = await this.collectionConfigRepository.findOne({
      where: {
        index,
      },
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
            as: 'path',
            maxDepth,
          },
        },
        { $unwind: { path: '$path' } },
        {
          $match: {
            'path.it': index,
          },
        },
        {
          $lookup: {
            from: config.collection,
            localField: 'path.target',
            foreignField: 'vertex',
            as: 'collection',
          },
        },
      ])
      .toArray()
      .then((upstreamArr: any[]) => {
        return upstreamArr.map((upstream) => {
          return {
            collection: upstream.collection[0],
            path: upstream.path,
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
      .toArray()
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

  private arrayIdFixer(array: any[]) {
    for (const item of array) {
      item.id = item._id;
      delete item._id;
    }
  }
}
