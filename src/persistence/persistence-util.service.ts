import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtRegistryDto } from './dto/jwt-registry.dto';
import { CollectionRepository } from './interfaces/collection.repository';
import { GraphRepository } from './interfaces/graph.repository';

@Injectable()
export class PersistenceUtilService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
  ) {}

  public async getAccount(registryJwt: JwtRegistryDto) {
    if (!registryJwt) {
      return null;
    }
    return this.collectionRepository.getCollectionById(
      'brokerAccount',
      registryJwt.accountId.toString(),
    );
  }

  async testAccess(
    edges: string[],
    userId: string,
    graphId: string,
    upstreamRecursive: boolean,
  ) {
    if (upstreamRecursive) {
      const config =
        await this.collectionRepository.getCollectionConfigByName('user');
      if (!config) {
        throw new InternalServerErrorException();
      }

      const upstream = await this.graphRepository.getUpstreamVertex(
        graphId,
        config.index,
        edges,
      );
      return (
        upstream.filter((data) => data.collection.vertex.toString() === userId)
          .length > 0
      );
    } else {
      for (const edgeName of edges) {
        const edge = await this.graphRepository.getEdgeByNameAndVertices(
          edgeName,
          userId,
          graphId,
        );
        if (!!edge) {
          return true;
        }
      }
      return false;
    }
  }
}
