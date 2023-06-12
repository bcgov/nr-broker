import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { EdgeDto } from '../dto/edge.dto';
import { VertexDto } from '../dto/vertex.dto';
import { GraphRepository } from '../interfaces/graph.repository';
import { CollectionConfigDto } from '../dto/collection-config.dto';
import { getRepositoryFromCollectionName } from './mongo.util';
import {
  GraphDataResponseDto,
  UpstreamResponseDto,
} from '../dto/graph-data.dto';
import { VertexInsertDto } from '../dto/vertex-rest.dto';
import { EdgeInsertDto } from '../dto/edge-rest.dto';

@Injectable()
export class GraphMongoRepository implements GraphRepository {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(CollectionConfigDto)
    private collectionConfigRepository: MongoRepository<CollectionConfigDto>,
    @InjectRepository(EdgeDto)
    private edgeRepository: MongoRepository<EdgeDto>,
    @InjectRepository(VertexDto)
    private vertexRepository: MongoRepository<VertexDto>,
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

  public async deleteEdge(id: string, cascade = true): Promise<boolean> {
    const edge = await this.getEdge(id);
    const srcVertex = await this.getVertex(edge.source.toString());
    const config = await this.getCollectionConfig(srcVertex.collection);
    const edgeConfig = config.edges.find((ec) => ec.name === edge.name);
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
      await this.deleteVertex(edge.target.toString());
    }
    // console.log(`edgeRepository.delete(${id})`);
    const result = await this.edgeRepository.delete(id);
    if (result.affected !== 1) {
      throw new Error();
    }
    return true;
  }

  public getEdge(id: string): Promise<EdgeDto | null> {
    return this.edgeRepository.findOne({
      where: { _id: new ObjectId(id) },
    });
  }

  public getEdgeTargetCount(target: string): Promise<number> {
    return this.edgeRepository.count({
      target,
    });
  }

  // Vertex
  public async deleteVertex(id: string): Promise<boolean> {
    const vertex = await this.getVertex(id);
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
        await this.deleteEdge(edge.id.toString(), false);
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
        await this.deleteEdge(edge.id.toString());
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
    const result = await this.vertexRepository.delete(id);
    return result.affected === 1;
  }

  public async addVertex(
    vertexInsert: VertexInsertDto,
    ignorePermissions = false,
  ): Promise<VertexDto> {
    const vertex = VertexDto.upgradeInsertDto(vertexInsert);
    const config = await this.getCollectionConfig(vertex.collection);
    const repository = getRepositoryFromCollectionName(
      this.dataSource,
      vertex.collection,
    );

    const collectionData = vertexInsert.data;

    if (!ignorePermissions && (config === null || !config.permissions.create)) {
      throw new Error();
    }

    for (const map of config.collectionMapper) {
      vertex[map.setPath] = collectionData[map.getPath];
    }
    const vertResult = await this.vertexRepository.insertOne(vertex);
    if (!vertResult.acknowledged) {
      throw new Error();
    }
    collectionData.vertex = vertResult.insertedId;
    //console.log(collectionData);
    const collResult = await repository.insertOne(collectionData);
    //console.log(collResult);

    if (!collResult.acknowledged) {
      throw new Error();
    }

    const rval = await this.getVertex(vertResult.insertedId.toString());
    if (rval === null) {
      throw new Error();
    }
    return rval;
  }

  public async editVertex(
    id: string,
    vertexInsert: VertexInsertDto,
  ): Promise<VertexDto> {
    const vertex = VertexDto.upgradeInsertDto(vertexInsert);
    const curVertex = this.getVertex(id);
    // console.log(vertex);
    if (curVertex === null) {
      throw new Error();
    }
    const config = await this.getCollectionConfig(vertex.collection);
    const repository = getRepositoryFromCollectionName(
      this.dataSource,
      vertex.collection,
    );

    const collectionData = vertexInsert.data;
    if (config === null || !config.permissions.update) {
      throw new Error();
    }
    // console.log(config.collectionMapper);
    for (const map of config.collectionMapper) {
      vertex[map.setPath] = collectionData[map.getPath];
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
    const unsetFields = {};
    for (const fkey of Object.keys(config.fields)) {
      if (collectionData[fkey] === undefined) {
        unsetFields[fkey] = '';
      }
    }
    // TODO: Check collectionData conforms on collection
    // Don't allow vertex or _id to be set
    delete collectionData._id;
    delete collectionData.vertex;
    // console.log(collectionData);
    const collResult = await repository.updateOne(
      { vertex: new ObjectId(id) },
      {
        $set: collectionData,
        $setOnInsert: {
          vertex: new ObjectId(id),
        },
        $unset: unsetFields,
      },
      { upsert: true },
    );
    if (collResult.matchedCount !== 1 && collResult.upsertedCount !== 1) {
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

  public async getUpstreamVertex(
    id: string,
    index: number,
    matchEdgeNames: string[] | null = null,
  ): Promise<UpstreamResponseDto[]> {
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
          return {
            collection: upstream.collection[0],
            path: upstream.path,
          };
        });
      });
  }
}
