import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { EdgeDto } from '../dto/edge.dto';
import { VertexDto } from '../dto/vertex.dto';
import { GraphRepository } from '../interfaces/graph.repository';

@Injectable()
export class GraphMongoRepository implements GraphRepository {
  constructor(
    @InjectRepository(EdgeDto)
    private edgeRepository: MongoRepository<EdgeDto>,
    @InjectRepository(VertexDto)
    private vertexRepository: MongoRepository<VertexDto>,
  ) {}

  public async getData(includeCollection: boolean): Promise<string> {
    const vertices = [
      ...(await this.aggregateVertex('project', 0, includeCollection)),
      ...(await this.aggregateVertex('service', 1, includeCollection)),
      ...(await this.aggregateVertex('serviceInstance', 2, includeCollection)),
      ...(await this.aggregateVertex('environment', 3, includeCollection)),
    ];
    const edges = await this.edgeRepository.find();
    // console.log(edges);
    return JSON.stringify({
      edges,
      vertices,
      categories: [
        { name: 'Project' },
        { name: 'Service' },
        { name: 'Instance' },
        { name: 'Environment' },
      ],
    });
  }

  private async aggregateVertex(
    type: string,
    category: number,
    includeData: boolean,
  ): Promise<any> {
    const aggregateArr: any = [{ $match: { type } }];
    if (includeData) {
      aggregateArr.push({
        $lookup: {
          from: type,
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
          data:
            Array.isArray(vertex.data) && vertex.data.length > 0
              ? vertex.data[0]
              : undefined,
          name: vertex.prop?.label ?? vertex._id,
          prop: vertex.prop,
          type: vertex.type,
        })),
      );
  }
}
