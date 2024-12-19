import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { EnvironmentEntity } from './entity/environment.entity';
import { JwtRegistryEntity } from './entity/jwt-registry.entity';
import { CollectionRepository } from './interfaces/collection.repository';
import { GraphRepository } from './interfaces/graph.repository';

const REDIS_ESCAPES_REPLACEMENTS = {
  ',': '\\,',
  '.': '\\.',
  '<': '\\<',
  '>': '\\>',
  '{': '\\{',
  '}': '\\}',
  '[': '\\[',
  ']': '\\]',
  '"': '\\"',
  "'": "\\'",
  ':': '\\:',
  ';': '\\;',
  '!': '\\!',
  '@': '\\@',
  '#': '\\#',
  $: '\\$',
  '%': '\\%',
  '^': '\\^',
  '&': '\\&',
  '*': '\\*',
  '(': '\\(',
  ')': '\\)',
  '-': '\\-',
  '+': '\\+',
  '=': '\\=',
  '~': '\\~',
};

export interface EnvironmentEntityMap {
  [key: string]: EnvironmentEntity;
}

@Injectable()
export class PersistenceUtilService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
  ) {}

  public async getAccount(registryJwt: JwtRegistryEntity) {
    if (!registryJwt) {
      return null;
    }
    return this.collectionRepository.getCollectionById(
      'brokerAccount',
      registryJwt.accountId.toString(),
    );
  }

  public async testUserPermissions(
    userVertexId: string,
    graphVertexId: string,
    permission: string,
  ) {
    return (
      (await this.graphRepository.getUserPermissions(userVertexId))[
        permission
      ].indexOf(graphVertexId) !== -1
    );
  }

  public async testAccess(
    matchEdgeNames: string[],
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
        matchEdgeNames,
      );
      return (
        upstream.filter((data) => data.collection.vertex.toString() === userId)
          .length > 0
      );
    } else {
      for (const edgeName of matchEdgeNames) {
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

  public async getEnvMap(): Promise<EnvironmentEntityMap> {
    const envs = await this.collectionRepository.getCollections('environment');
    const envMap: { [key: string]: EnvironmentEntity } = {};
    for (const env of envs) {
      envMap[env.name] = env;
      if (env.short) {
        envMap[env.short] = env;
      }
      for (const name of env.aliases) {
        envMap[name] = env;
      }
    }
    return envMap;
  }

  public escapeRedisStr(value: string) {
    const newValue = value.replace(
      /,|\.|<|>|\{|\}|\[|\]|"|'|:|;|!|@|#|\$|%|\^|&|\*|\(|\)|-|\+|=|~/g,
      function (x) {
        return REDIS_ESCAPES_REPLACEMENTS[x];
      },
    );
    return newValue;
  }
}
