import { Injectable } from '@nestjs/common';
import { get, set } from 'radash';
import deepEqual from 'deep-equal';
import { plainToClass } from 'class-transformer';

import { INTENTION_SERVICE_INSTANCE_SEARCH_PATHS } from '../constants';
import { IntentionDto } from '../intention/dto/intention.dto';
import { ActionDto } from '../intention/dto/action.dto';
import { CollectionNames } from '../persistence/dto/collection-dto-union.type';
import { VertexDto } from '../persistence/dto/vertex.dto';
import { PersistenceUtilService } from '../persistence/persistence-util.service';
import { GraphService } from './graph.service';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { EdgePropDto } from '../persistence/dto/edge-prop.dto';
import { ActionUtil } from '../util/action.util';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { IntentionActionPointerDto } from '../persistence/dto/intention-action-pointer.dto';
import { BuildRepository } from '../persistence/interfaces/build.repository';
import { BrokerAccountDto } from '../persistence/dto/broker-account.dto';
import { IntentionRepository } from '../persistence/interfaces/intention.repository';

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
    private readonly buildRepository: BuildRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly graphService: GraphService,
    private readonly graphRepository: GraphRepository,
    private readonly intentionRepository: IntentionRepository,
    private readonly persistenceUtilService: PersistenceUtilService,
    private readonly actionUtil: ActionUtil,
  ) {}

  public async sync(intention: IntentionDto, account: BrokerAccountDto) {
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
      if (account) {
        const accountVertex = await this.graphRepository.getVertex(
          account.vertex.toString(),
        );
        this.overlayEdge('authorized', accountVertex, projectVertex);
      }
      if (
        action.service.environment &&
        action.action === 'package-installation'
      ) {
        await this.syncPackageInstall(intention, action, serviceVertex);
        await this.syncPackageBuild(intention, action, serviceVertex);
      }

      if (action.action === 'package-build') {
        await this.syncPackageBuild(intention, action, serviceVertex);
      }
    }
  }

  private async syncPackageBuild(
    intention: IntentionDto,
    action: ActionDto,
    serviceVertex: VertexDto,
  ) {
    if (!action.package || !action.package.name || !action.package.version) {
      // Not enough package information to save
      return;
    }

    const parsedVersion = this.actionUtil.parseVersion(action.package.version);
    if (!parsedVersion || parsedVersion.prerelease) {
      // Not a valid version. Should not occur.
      return;
    }
    if (parsedVersion.prerelease) {
      // Pre-release versions are not release candidates -- not recorded
      return;
    }

    const service = await this.collectionRepository.getCollectionByVertexId(
      'service',
      serviceVertex.id.toString(),
    );
    if (!service) {
      // Awkward. There should be a service here...
      return;
    }

    let packageBuild = await this.buildRepository.getBuildByPackageDetail(
      service.id.toString(),
      action.package.name,
      parsedVersion,
    );
    if (!packageBuild) {
      packageBuild = await this.buildRepository.addBuild(
        intention.id.toString(),
        this.actionUtil.actionToIdString(action),
        service.id.toString(),
        action.package.name,
        parsedVersion,
        action.package,
      );

      // Warning: Setting it here because close uses sideffects
      action.package.id = packageBuild.id;

      await this.intentionRepository.setActionPackageBuildRef(
        intention.id,
        action.id,
        packageBuild.id,
      );
    }

    if (action.action === 'package-installation') {
      await this.buildRepository.addInstallActionToBuild(
        packageBuild.id.toString(),
        plainToClass(IntentionActionPointerDto, {
          action: this.actionUtil.actionToIdString(action),
          intention: intention.id,
        }),
      );
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
        ...INTENTION_SERVICE_INSTANCE_SEARCH_PATHS.map((path) => ({
          key: 'name',
          path,
        })),
        {
          key: 'action.intention',
          value: intention.id,
        },
        {
          key: 'action.action',
          value: this.actionUtil.actionToIdString(action),
        },
        {
          key: 'actionHistory[0].intention',
          value: intention.id,
        },
        {
          key: 'actionHistory[0].action',
          value: this.actionUtil.actionToIdString(action),
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

    const serverVertex = await this.syncServer(action);
    if (serverVertex) {
      const instanceName = this.actionUtil.instanceName(action);
      this.syncInstallationProperties(
        serviceVertex,
        instanceName,
        serverVertex,
        action.cloud.target.propStrategy,
        action.cloud.target.prop,
      );
    }
  }

  public async syncServer(action: ActionDto) {
    const serverName = action.cloud?.target?.instance?.name;
    if (!serverName) {
      return null;
    }
    // Warning: Assumes server names are unique across all clouds
    // TOOD: Only assume name is unique within a cloud when finding
    const serverVertex = await this.graphRepository.getVertexByName(
      'server',
      serverName,
    );

    // TODO: overlay cloud and server vertices by combining action and install target objects

    return serverVertex;
  }

  public async syncInstallationProperties(
    serviceVertex: VertexDto,
    instanceName: string,
    serverVertex: VertexDto,
    propStrategy: 'merge' | 'replace' = 'merge',
    prop: EdgePropDto,
  ) {
    const instanceVertex =
      await this.graphRepository.getVertexByParentIdAndName(
        'serviceInstance',
        serviceVertex.id.toString(),
        instanceName,
      );

    await this.overlayEdge(
      'installation',
      instanceVertex,
      serverVertex,
      propStrategy,
      prop,
    );
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

  private async overlayEdge(
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

  private async overlayEdgeById(
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
      } catch (e) {
        // ignore
      }
    }
  }
}
