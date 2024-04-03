import { Injectable } from '@nestjs/common';
import { get, set } from 'radash';
import deepEqual from 'deep-equal';
import { IntentionDto } from '../intention/dto/intention.dto';
import { ActionDto } from '../intention/dto/action.dto';
import { CollectionNames } from '../persistence/dto/collection-dto-union.type';
import { VertexDto } from '../persistence/dto/vertex.dto';
import { PersistenceUtilService } from '../persistence/persistence-util.service';
import { GraphService } from './graph.service';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { EdgePropDto } from '../persistence/dto/edge-prop.dto';

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
    private readonly graphService: GraphService,
    private readonly graphRepository: GraphRepository,
    private readonly persistenceUtilService: PersistenceUtilService,
  ) {}

  public async sync(intention: IntentionDto) {
    // console.log(intention);
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
        await this.syncPackageInstall(intention, action, serviceVertex);
      }
    }
  }

  public async syncPackageInstall(
    intention: IntentionDto,
    action: ActionDto,
    serviceVertex: VertexDto,
  ) {
    const envMap = await this.persistenceUtilService.getEnvMap();
    const context = {
      action,
      intention,
    };
    const serviceInstanceVertex = await this.overlayVertex(
      context,
      'serviceInstance',
      [
        { key: 'name', path: 'action.service.environment' },
        { key: 'name', path: 'action.service.instanceName' },
        {
          key: 'action.intention',
          value: intention.id.toString(),
        },
        {
          key: 'action.action',
          value: `${action.action}#${action.id}`,
        },
        {
          key: 'actionHistory[0].intention',
          value: intention.id.toString(),
        },
        {
          key: 'actionHistory[0].action',
          value: `${action.action}#${action.id}`,
        },
      ],
      'parentId',
      serviceVertex.id.toString(),
    );
    await this.overlayEdge('instance', serviceVertex, serviceInstanceVertex);
    if (envMap[action.service.environment]) {
      this.overlayEdgeById(
        'deploy-type',
        serviceInstanceVertex.id.toString(),
        envMap[action.service.environment].vertex.toString(),
      );
    }
  }

  private async overlayVertex(
    context: {
      action: ActionDto;
      intention: IntentionDto;
    },
    collection: CollectionNames,
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

    return this.graphService.upsertVertex(
      null,
      {
        collection,
        data,
      },
      targetBy,
      target,
    );
  }

  public async overlayEdge(
    name: string,
    source: VertexDto,
    target: VertexDto,
    propStrategy: 'merge' | 'replace' = 'merge',
    prop?: EdgePropDto,
  ) {
    if (source && target) {
      return this.overlayEdgeById(
        name,
        source.id.toString(),
        target.id.toString(),
        propStrategy,
        prop,
      );
    }
  }

  public async overlayEdgeById(
    name: string,
    source: string,
    target: string,
    propStrategy: 'merge' | 'replace' = 'merge',
    prop?: EdgePropDto,
  ) {
    if (source && target) {
      const curr = await this.graphRepository.getEdgeByNameAndVertices(
        name,
        source,
        target,
      );
      if (curr && prop) {
        const saveProps =
          propStrategy === 'replace'
            ? prop
              ? prop
              : {}
            : { ...(curr.prop ? curr.prop : {}), ...prop };
        if (!deepEqual(curr.prop, saveProps, { strict: true })) {
          // Save prop changes
          this.graphService.editEdge(null, curr.id.toString(), {
            name,
            source: source,
            target: target,
            prop: saveProps,
          });
        }
        return curr;
      }
      try {
        return await this.graphService.addEdge(null, {
          name,
          source: source,
          target: target,
          ...(prop ? { prop } : {}),
        });
      } catch (e) {}
    }
  }
}
