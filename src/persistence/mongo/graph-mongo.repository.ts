import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { EdgeDto } from '../dto/edge.dto';
import { VertexCollectionDto, VertexDto } from '../dto/vertex.dto';
import { GraphRepository } from '../interfaces/graph.repository';
import { CollectionConfigDto } from '../dto/collection-config.dto';
import { ServiceInstanceDto } from '../dto/service-instance.dto';
import { ServiceDto } from '../dto/service.dto';
import { ProjectDto } from '../dto/project.dto';
import { EnvironmentDto } from '../dto/environment.dto';
import { UserDto } from '../dto/user.dto';

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

  public async getData(includeCollection: boolean): Promise<string> {
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
    return JSON.stringify({
      edges,
      vertices: [].concat(...verticeArrs),
      categories: configs.map((config) => {
        return {
          name: config.name,
        };
      }),
    });
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
  public async addEdge(edge: EdgeDto): Promise<EdgeDto> {
    const sourceVertex = await this.getVertex(edge.source);
    const targetVertex = await this.getVertex(edge.target);
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
    edge.st = [sourceConfig.index, targetConfig.index];
    const edgeConfig = sourceConfig.edges.find(
      (edgeConfig) => edgeConfig.name === edge.name,
    );

    // No duplicate edges
    const relationCnt = await this.edgeRepository.count({
      source: new ObjectId(edge.source),
      target: new ObjectId(edge.target),
      name: edge.name,
    });
    if (relationCnt > 0) {
      throw new Error();
    }

    if (edgeConfig.relation === 'oneToOne') {
      // No additional edges
      const relationCnt = await this.edgeRepository.count({
        source: new ObjectId(edge.source),
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
    const srcVertex = await this.getVertex(edge.source);
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
      (await this.getEdgeTargetCount(edge.target)) === 1
    ) {
      await this.deleteVertex(edge.target);
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
    const collectionRepository = this.getRepositoryFromCollectionName(
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
    vertex: VertexCollectionDto,
    ignorePermissions = false,
  ): Promise<VertexDto> {
    const config = await this.getCollectionConfig(vertex.collection);
    const repository = this.getRepositoryFromCollectionName(vertex.collection);

    const collectionData = vertex.data;
    delete vertex.data;

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
    vertex: VertexCollectionDto,
  ): Promise<VertexDto> {
    const curVertex = this.getVertex(id);
    // console.log(vertex);
    if (curVertex === null || vertex.id.toString() !== id) {
      throw new Error();
    }
    const config = await this.getCollectionConfig(vertex.collection);
    const repository = this.getRepositoryFromCollectionName(vertex.collection);
    const collectionObj = await repository.findOne({
      where: { vertex: new ObjectId(id) },
    });

    const collectionData = vertex.data;
    delete vertex.data;
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
    // console.log(collectionObj);
    if (collectionObj === null) {
      collectionData.vertex = new ObjectId(id);
      const collResult = await repository.insertOne(collectionData);
      // console.log(collResult);

      if (!collResult.acknowledged) {
        throw new Error();
      }
    } else {
      // console.log(collectionObj);
      // console.log(collectionData);
      const collResult = await repository.updateOne(
        { vertex: new ObjectId(id) },
        {
          $set: collectionData,
        },
      );
      if (collResult.matchedCount !== 1) {
        throw new Error();
      }
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

  private getRepositoryFromCollectionName(name: string): MongoRepository<any> {
    switch (name) {
      case 'environment':
        return this.dataSource.getMongoRepository(EnvironmentDto);
      case 'project':
        return this.dataSource.getMongoRepository(ProjectDto);
      case 'serviceInstance':
        return this.dataSource.getMongoRepository(ServiceInstanceDto);
      case 'service':
        return this.dataSource.getMongoRepository(ServiceDto);
      case 'user':
        return this.dataSource.getMongoRepository(UserDto);
      default:
        throw Error();
    }
  }
}
