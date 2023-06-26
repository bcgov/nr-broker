import { Injectable } from '@nestjs/common';
import { get, set } from 'radash';
import { IntentionDto } from '../intention/dto/intention.dto';
import { ActionDto } from '../intention/dto/action.dto';
import { CollectionRepository } from './interfaces/collection.repository';
import { GraphRepository } from './interfaces/graph.repository';
import { CollectionDtoUnion } from './dto/collection-dto-union.type';
import { VertexDto } from './dto/vertex.dto';
import { EnvironmentDto } from './dto/environment.dto';

interface OverlayMapBase {
  key: string;
  path?: string;
  value?: any;
}

interface OverlayMapWithPath extends OverlayMapBase {
  path: string;
  value?: never;
}

interface OverlayMapWithValue extends OverlayMapBase {
  path?: never;
  value: any;
}

type OverlayMap = OverlayMapWithPath | OverlayMapWithValue;

@Injectable()
export class IntentionSyncService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
  ) {}

  public async sync(intention: IntentionDto) {
    const envs = await this.collectionRepository.getCollections('environment');
    const envMap: { [key: string]: EnvironmentDto } = {};
    for (const env of envs) {
      envMap[env.name] = env;
      if (env.short) {
        envMap[env.short] = env;
      }
      for (const name of env.aliases) {
        envMap[name] = env;
      }
    }
    for (const action of intention.actions) {
      const context = {
        action,
        intention,
      };
      const projectVertex = await this.overlayVertex(
        context,
        'project',
        [{ key: 'name', path: 'action.service.project' }],
        'name',
      );
      const serviceVertex = await this.overlayVertex(
        context,
        'service',
        [{ key: 'name', path: 'action.service.name' }],
        'name',
      );
      this.overlayEdge('component', projectVertex, serviceVertex);
      if (
        action.service.environment &&
        action.action === 'package-installation'
      ) {
        const serviceInstanceVertex = await this.overlayVertex(
          context,
          'serviceInstance',
          [
            { key: 'name', path: 'action.service.environment' },
            { key: 'name', path: 'action.service.instanceName' },
            {
              key: 'pkgInstallHistory[0].architecture',
              path: 'action.package.architecture',
            },
            {
              key: 'pkgInstallHistory[0].build_version',
              path: 'action.package.build_version',
            },
            {
              key: 'pkgInstallHistory[0].checksum',
              path: 'action.package.checksum',
            },
            {
              key: 'pkgInstallHistory[0].description',
              path: 'action.package.description',
            },
            {
              key: 'pkgInstallHistory[0].installScope',
              path: 'action.package.installScope',
            },
            { key: 'pkgInstallHistory[0].installed', value: new Date() },
            {
              key: 'pkgInstallHistory[0].license',
              path: 'action.package.license',
            },
            { key: 'pkgInstallHistory[0].name', path: 'action.package.name' },
            { key: 'pkgInstallHistory[0].path', path: 'action.package.path' },
            {
              key: 'pkgInstallHistory[0].reference',
              path: 'action.package.reference',
            },
            { key: 'pkgInstallHistory[0].size', path: 'action.package.size' },
            { key: 'pkgInstallHistory[0].type', path: 'action.package.type' },
            {
              key: 'pkgInstallHistory[0].version',
              path: 'action.package.version',
            },
            { key: 'pkgInstallHistory[0].userId', path: 'intention.user.id' },
          ],
          'parentId',
          serviceVertex.id.toString(),
        );
        await this.overlayEdge(
          'instance',
          serviceVertex,
          serviceInstanceVertex,
        );
        if (envMap[action.service.environment]) {
          this.overlayEdgeById(
            'deploy-type',
            serviceInstanceVertex.id.toString(),
            envMap[action.service.environment].vertex.toString(),
          );
        }
      }
    }
  }

  private async overlayVertex(
    context: {
      action: ActionDto;
      intention: IntentionDto;
    },
    collection: keyof CollectionDtoUnion,
    configs: OverlayMap[],
    targetBy: 'id' | 'parentId' | 'name',
    target: string | null = null,
  ) {
    let data = {};
    for (const config of configs) {
      if (config.path) {
        const val = get(context, config.path);
        if (val) {
          data = set(data, config.key, get(context, config.path, val));
        }
      } else {
        data = set(data, config.key, config.value);
      }
    }
    console.log(data);
    return this.graphRepository.upsertVertex(
      {
        collection,
        data,
      },
      targetBy,
      target,
    );
  }

  private async overlayEdge(
    name: string,
    source: VertexDto,
    target: VertexDto,
  ) {
    if (source && target) {
      return this.overlayEdgeById(
        name,
        source.id.toString(),
        target.id.toString(),
      );
    }
  }

  private async overlayEdgeById(
    name: string,
    sourceId: string,
    targetId: string,
  ) {
    if (sourceId && targetId) {
      const curr = await this.graphRepository.getEdgeByNameAndVertices(
        name,
        sourceId,
        targetId,
      );
      if (curr) {
        return curr;
      }
      try {
        return await this.graphRepository.addEdge({
          name,
          source: sourceId,
          target: targetId,
        });
      } catch (e) {}
    }
  }
}
