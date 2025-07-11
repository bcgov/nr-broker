import { Injectable } from '@nestjs/common';
import delve from 'dlv';
import { dset } from 'dset';
import deepEqual from 'deep-equal';
import { plainToClass } from 'class-transformer';

import { INTENTION_SERVICE_INSTANCE_SEARCH_PATHS } from '../constants';
import { IntentionEntity } from '../intention/entity/intention.entity';
import { CollectionNames } from '../persistence/dto/collection-dto-union.type';
import { VertexEntity } from '../persistence/entity/vertex.entity';
import { PersistenceUtilService } from '../persistence/persistence-util.service';
import { GraphService } from './graph.service';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { EdgePropDto } from '../persistence/dto/edge-prop.dto';
import { ActionUtil } from '../util/action.util';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { IntentionActionPointerEmbeddable } from '../persistence/entity/intention-action-pointer.embeddable';
import { BuildRepository } from '../persistence/interfaces/build.repository';
import { BrokerAccountEntity } from '../persistence/entity/broker-account.entity';
import { IntentionRepository } from '../persistence/interfaces/intention.repository';
import { ActionEmbeddable } from '../intention/entity/action.embeddable';
import { VertexInsertDto } from '../persistence/dto/vertex.dto';

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

  public async sync(intention: IntentionEntity, account: BrokerAccountEntity) {
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
        const serviceAuth = await this.graphRepository.getEdgeByNameAndVertices(
          'authorized',
          accountVertex.id.toString(),
          serviceVertex.id.toString(),
        );
        if (!serviceAuth) {
          // If not authorized through service, default to by project.
          this.overlayEdge('authorized', accountVertex, projectVertex);
        }
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
    intention: IntentionEntity,
    action: ActionEmbeddable,
    serviceVertex: VertexEntity,
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

    let currentPackageBuild =
      await this.buildRepository.getServiceBuildByVersion(
        service.id.toString(),
        action.package.name,
        parsedVersion,
      );
    if (action.action === 'package-build') {
      if (currentPackageBuild) {
        await this.buildRepository.markBuildAsReplaced(currentPackageBuild);
      }
      currentPackageBuild = await this.buildRepository.addBuild(
        intention.id.toString(),
        this.actionUtil.actionToIdString(action),
        service.id.toString(),
        action.package.name,
        parsedVersion,
        action.package,
      );
    }

    if (!currentPackageBuild) {
      // No package build. Should not occur as build creates it and release install should
      // not be impossible without a build.
      return;
    }

    // Warning: Setting it here because close uses side-effects
    action.package.id = currentPackageBuild._id;

    await this.intentionRepository.setActionPackageBuildRef(
      intention.id,
      action.id,
      currentPackageBuild._id,
    );

    if (action.action === 'package-installation') {
      await this.buildRepository.addInstallActionToBuild(
        currentPackageBuild.id.toString(),
        plainToClass(IntentionActionPointerEmbeddable, {
          action: this.actionUtil.actionToIdString(action),
          intention: intention.id,
        }),
      );
    }
  }

  public async syncPackageInstall(
    intention: IntentionEntity,
    action: ActionEmbeddable,
    serviceVertex: VertexEntity,
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
          key: 'actionHistory.0.intention',
          value: intention.id,
        },
        {
          key: 'actionHistory.0.action',
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

  public async syncServer(action: ActionEmbeddable) {
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
    serviceVertex: VertexEntity,
    instanceName: string,
    serverVertex: VertexEntity,
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
      action: ActionEmbeddable;
      intention: IntentionEntity;
    },
    collection: CollectionNames,
    configs: OverlayMap[],
    targetBy: 'id' | 'parentId' | 'name',
    target: string | null = null,
  ) {
    const data = {};
    for (const config of configs) {
      if (config.path) {
        const val = delve(context, config.path);
        if (val) {
          dset(data, config.key, delve(context, config.path, val));
        }
      } else {
        dset(data, config.key, config.value);
      }
    }

    return this.graphService.upsertVertex(
      null,
      plainToClass(VertexInsertDto, {
        collection,
        data,
      }),
      targetBy,
      target,
    );
  }

  private async overlayEdge(
    name: string,
    source: VertexEntity,
    target: VertexEntity,
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
      if (curr) {
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
