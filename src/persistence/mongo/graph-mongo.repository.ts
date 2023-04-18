import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MongoRepository, Repository } from 'typeorm';
import { ObjectID } from 'mongodb';
import { EdgeDto } from '../dto/edge.dto';
import { VertexCollectionDto, VertexDto } from '../dto/vertex.dto';
import { GraphRepository } from '../interfaces/graph.repository';
import { CollectionConfigDto } from '../dto/collection-config.dto';
import { ServiceInstanceDto } from '../dto/service-instance.dto';
import { ServiceDto } from '../dto/service.dto';
import { ProjectDto } from '../dto/project.dto';
import { EnvironmentDto } from '../dto/environment.dto';

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
      .then((vertices) =>
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
  ): Promise<CollectionConfigDto> {
    return this.collectionConfigRepository.findOne({
      where: { collection },
    });
  }

  // Edge
  public async addEdge(edge: EdgeDto): Promise<boolean> {
    const sourceVertex = await this.getVertex(edge.source);
    const targetVertex = await this.getVertex(edge.target);
    const sourceConfig = await this.getCollectionConfig(
      sourceVertex.collection,
    );
    const targetConfig = await this.getCollectionConfig(
      targetVertex.collection,
    );
    edge.st = [sourceConfig.index, targetConfig.index];
    const result = await this.edgeRepository.insertOne(edge);
    return result.insertedCount === 1;
  }

  public async deleteEdge(id: string): Promise<boolean> {
    const edge = await this.getEdge(id);
    const srcVertex = await this.getVertex(edge.source);
    const config = await this.getCollectionConfig(srcVertex.collection);
    const edgeConfig = config.edges.find((ec) => ec.name === edge.name);
    if (edgeConfig.onDelete === 'cascade') {
      await this.deleteVertex(edge.target);
    }
    const result = await this.edgeRepository.delete(id);
    return result.affected === 1;
  }

  public getEdge(id: string): Promise<EdgeDto> {
    return this.edgeRepository.findOne({
      where: { _id: ObjectID(id) },
    });
  }

  // Vertex
  public async deleteVertex(id: string): Promise<boolean> {
    const vertex = await this.getVertex(id);

    // Find and delete all edges using vertex as a source
    const edges = await this.edgeRepository.find({
      where: { source: ObjectID(vertex.id) },
    });

    for (const edge of edges) {
      await this.deleteEdge(edge.id.toString());
    }

    // Delete associated collection
    const collectionRepository = this.getRepositoryFromCollectionName(
      vertex.collection,
    );
    const entry = await collectionRepository.findOne({
      where: { vertex: ObjectID(vertex.id) },
    });
    // console.log(entry);
    await collectionRepository.delete(entry.id);
    // Delete vertex
    const result = await this.vertexRepository.delete(id);
    return result.affected === 1;
  }

  public async addVertex(vertex: VertexCollectionDto): Promise<boolean> {
    const collectionData = vertex.data;
    delete vertex.data;
    const config = await this.getCollectionConfig(vertex.collection);
    for (const map of config.collectionMapper) {
      vertex[map.setPath] = collectionData[map.getPath];
    }
    const vertResult = await this.vertexRepository.insertOne(vertex);
    const repository = this.getRepositoryFromCollectionName(vertex.collection);
    collectionData.vertex = vertResult.insertedId;
    console.log(collectionData);
    const collResult = await repository.insertOne(collectionData);
    console.log(collResult);
    return vertResult.insertedCount === 1;
  }

  public async editVertex(
    id: string,
    vertex: VertexCollectionDto,
  ): Promise<boolean> {
    const collectionData = vertex.data;
    delete vertex.data;
    const result = await this.vertexRepository.insertOne(vertex);
    const repository = this.getRepositoryFromCollectionName(vertex.collection);
    collectionData.vertex = result.insertedId;
    repository.insertOne(collectionData);
    return result.insertedCount === 1;
  }

  public getVertex(id: string): Promise<VertexDto> {
    return this.vertexRepository.findOne({
      where: { _id: ObjectID(id) },
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
      default:
        throw Error();
    }
  }
}
