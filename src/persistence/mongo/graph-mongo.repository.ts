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

  public async getData(includeNodeData: boolean): Promise<string> {
    const nodes = [
      ...(await this.aggregateNode('project', 0, includeNodeData)),
      ...(await this.aggregateNode('service', 1, includeNodeData)),
      ...(await this.aggregateNode('serviceInstance', 2, includeNodeData)),
      ...(await this.aggregateNode('environment', 3, includeNodeData)),
    ];
    const links = await this.edgeRepository.find();
    console.log(links);
    return JSON.stringify({
      links,
      nodes,
      categories: [
        { name: 'Project' },
        { name: 'Service' },
        { name: 'Instance' },
        { name: 'Environment' },
      ],
    });
  }

  private async aggregateNode(
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
      .then((nodes) =>
        nodes.map((node) => ({
          id: node._id,
          category,
          data:
            Array.isArray(node.data) && node.data.length > 0
              ? node.data[0]
              : undefined,
          name: node.prop?.label ?? node._id,
          prop: node.prop,
          type: node.type,
        })),
      );
  }
}
