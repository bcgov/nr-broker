import { Injectable, Logger } from '@nestjs/common';
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

/**
 * Intention Sync Service
 *
 * Synchronizes graph data (vertices and edges) when an intention is closed with a 'success' outcome.
 *
 * ## How Intention Sync Works
 *
 * When an intention closes successfully, `finalizeIntention` in `intention.service.ts` calls
 * `sync(intention, account)` to update the graph with deployment facts. The sync process:
 *
 * 1. **Iterates over all actions** in the intention and for each action:
 *    - Creates or updates a **project vertex** from `action.service.project`
 *    - Creates or updates a **service vertex** from `action.service.name`
 *    - Links them with a **'component' edge** (project → service)
 *    - If an account exists, ensures an **'authorized' edge** (account → project), unless
 *      already authorized via service
 *
 * 2. **For 'package-installation' actions**:
 *    - Calls `syncPackageInstall` to create/update a **serviceInstance vertex** and link it with:
 *      - An **'instance' edge** (service → serviceInstance)
 *      - A **'deploy-type' edge** (serviceInstance → environment vertex, e.g., production/test/development)
 *    - Calls `syncPackageBuild` to record or update the **package build** in the build repository
 *    - Syncs the **server vertex** and creates an **'installation' edge** (serviceInstance → server)
 *    - Syncs cloud-related vertices (e.g., OpenShift projects) and links them appropriately
 *
 * 3. **For 'package-build' actions**:
 *    - Calls `syncPackageBuild` to create a new build record, marking any existing builds as replaced
 *
 * ## Overlay Mechanism
 *
 * The `overlayVertex` and `overlayEdge` methods use an "upsert" pattern:
 * - **overlayVertex**: Searches for an existing vertex by name or parent ID, updates if found, creates if not
 * - **overlayEdge**: Checks if an edge already exists between two vertices, updates props if changed, creates if new
 *
 * Data is extracted from the action/intention context using `dlv` (deep value lookup) and written
 * to vertices via `dset` (deep set), enabling flexible mapping of nested action properties.
 *
 * ## Logging
 *
 * The service logs warnings when:
 * - A vertex cannot be created or updated (e.g., missing required fields)
 * - An edge cannot be added (e.g., duplicate, constraint violation)
 * - A build record is missing when one is expected
 */

@Injectable()
export class IntentionSyncService {
  private readonly logger = new Logger(IntentionSyncService.name);

  constructor(
    private readonly buildRepository: BuildRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly graphService: GraphService,
    private readonly graphRepository: GraphRepository,
    private readonly intentionRepository: IntentionRepository,
    private readonly persistenceUtilService: PersistenceUtilService,
    private readonly actionUtil: ActionUtil,
  ) {}

  /**
   * Main entry point for syncing graph data from a closed intention.
   *
   * Called by `finalizeIntention` when an intention closes with outcome 'success'.
   * Iterates over all actions and creates/updates vertices (project, service, serviceInstance)
   * and edges (component, authorized, instance, deploy-type, installation) in the graph.
   *
   * @param intention - The closed intention entity containing actions to sync
   * @param account - The broker account that owns the intention (may be null for system intentions)
   */
  public async sync(intention: IntentionEntity, account: BrokerAccountEntity) {
    this.logger.log(
      `Syncing graph data for intention ${intention.id.toString()} with ${intention.actions.length} action(s)`,
    );
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

  /**
   * Syncs package build records for an action.
   *
   * For 'package-build' actions: creates a new build record and marks any existing build as replaced.
   * For 'package-installation' actions: links the installation to an existing build record.
   *
   * Pre-release versions are skipped (not recorded). Requires complete package information
   * (name, version) to proceed.
   *
   * @param intention - The intention containing the action
   * @param action - The action with package build/installation details
   * @param serviceVertex - The service vertex to associate the build with
   */
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
      this.logger.warn(
        `Service collection not found for vertex ${serviceVertex.id.toString()} during build sync for intention ${intention.id.toString()}`,
      );
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
      this.logger.warn(
        `No package build found for service ${service.id.toString()}, package ${action.package.name}, version ${JSON.stringify(parsedVersion)} in intention ${intention.id.toString()}. Build should have been created by a prior package-build action.`,
      );
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

  /**
   * Syncs service instance vertices and edges for a package installation action.
   *
   * Creates or updates a serviceInstance vertex by searching through multiple paths in the
   * intention/action data (INTENTION_SERVICE_INSTANCE_SEARCH_PATHS). Links the instance to:
   * - The parent service via an 'instance' edge
   * - The environment type (production/test/development) via a 'deploy-type' edge
   * - The target server via an 'installation' edge
   * - Cloud resources (e.g., OpenShift projects) via appropriate edges
   *
   * @param intention - The intention containing the installation action
   * @param action - The package-installation action with cloud and service details
   * @param serviceVertex - The parent service vertex
   */
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

    const serverVertex = await this.syncCloudInfrastructure(action);
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

  /**
   * Syncs the target vertex (server or OpenShift project) from action cloud data.
   *
   * Uses a switch on `cloud.target.provider` to determine which vertex collection to look up:
   * - **'on-premise'**: Retrieves a **server vertex** from `action.cloud.target.instance.name`
   * - **'openshift'**: Retrieves an **openshiftProject vertex** from `action.cloud.target.project.name`
   *
   * @param action - The action containing cloud target information
   * @returns The target vertex entity, or null if no target could be resolved
   */
  public async syncCloudInfrastructure(action: ActionEmbeddable) {
    const provider = action.cloud?.target?.provider;

    switch (provider) {
      case 'on-premise':
        return this.syncOnPremiseServer(action);

      case 'openshift':
        return this.syncOpenShiftProject(action);

      default:
        this.logger.debug(
          `Unknown cloud provider '${provider ?? 'none'}' for action ${action.id}. Defaulting to on-premise server sync.`,
        );
        return this.syncOnPremiseServer(action);
    }
  }

  /**
   * Syncs an on-premise server vertex from action cloud target data.
   *
   * @param action - The action containing cloud target information
   * @returns The server vertex entity, or null if no server name is provided
   */
  private async syncOnPremiseServer(action: ActionEmbeddable) {
    const serverName = action.cloud?.target?.instance?.name;
    if (!serverName) {
      this.logger.debug(
        `No server name found in action ${action.id}, skipping on-premise server sync`,
      );
      return null;
    }

    const serverVertex = await this.graphRepository.getVertexByName(
      'server',
      serverName,
    );

    if (!serverVertex) {
      this.logger.warn(
        `Server vertex '${serverName}' not found for action ${action.id}. Server should be registered before installation.`,
      );
      return null;
    }

    return serverVertex;
  }

  /**
   * Syncs an OpenShift project vertex from action cloud target data.
   *
   * @param action - The action containing cloud target information
   * @returns The OpenShift project vertex entity, or null if not applicable
   */
  private async syncOpenShiftProject(action: ActionEmbeddable) {
    const projectName = action.cloud?.target?.project?.name;

    if (!projectName) {
      this.logger.debug(
        `No OpenShift project name found in action ${action.id}, skipping OpenShift project sync`,
      );
      return null;
    }

    const openshiftProjectVertex = await this.graphRepository.getVertexByName(
      'openshiftProject',
      projectName,
    );

    if (!openshiftProjectVertex) {
      this.logger.warn(
        `OpenShift project '${projectName}' not found for action ${action.id}. Project should be registered before installation.`,
      );
      return null;
    }

    return openshiftProjectVertex;
  }

  /**
   * Syncs installation properties by creating an 'installation' edge between a service instance
   * and a server vertex.
   *
   * Looks up the service instance vertex by parent (service) and instance name, then creates
   * or updates the installation edge with merge/replace strategy for properties.
   *
   * @param serviceVertex - The parent service vertex
   * @param instanceName - The name of the service instance
   * @param serverVertex - The target server vertex
   * @param propStrategy - 'merge' to combine with existing props, 'replace' to overwrite (default: 'merge')
   * @param prop - Edge properties to set on the installation edge
   */
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

    if (!instanceVertex) {
      this.logger.warn(
        `Service instance '${instanceName}' not found under service ${serviceVertex.id.toString()}, cannot create installation edge`,
      );
      return;
    }

    await this.overlayEdge(
      'installation',
      instanceVertex,
      serverVertex,
      propStrategy,
      prop,
    );
  }

  /**
   * Upserts a vertex by extracting data from the action/intention context.
   *
   * Uses `dlv` to read nested properties from the context and `dset` to write them
   * to a new vertex data object. Supports three targeting modes:
   * - 'id': Direct update by vertex ID
   * - 'parentId': Find by parent + name, create if not found
   * - 'name': Find by unique name, create if not found
   *
   * @param context - Object containing action and intention for data extraction
   * @param collection - The collection type (e.g., 'project', 'service', 'serviceInstance')
   * @param configs - Array of overlay maps defining how to extract/set data fields
   * @param targetBy - How to identify the target vertex ('id', 'parentId', or 'name')
   * @param target - The target identifier (vertex ID for 'id', parent ID for 'parentId', ignored for 'name')
   * @returns The created or updated vertex entity
   */
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

  /**
   * Creates or updates an edge between two vertices by their IDs.
   *
   * If the edge already exists, it checks whether properties have changed and updates only if necessary.
   * If the edge doesn't exist, it attempts to create it. Logs warnings when creation fails or
   * when source/target are missing, and debug messages for successful operations.
   *
   * @param name - The edge name (e.g., 'component', 'instance', 'installation')
   * @param source - Source vertex ID string
   * @param target - Target vertex ID string
   * @param propStrategy - 'merge' to combine with existing props, 'replace' to overwrite (default: 'merge')
   * @param prop - Optional edge properties to set
   * @returns The edge entity if found or created, undefined otherwise
   */
  private async overlayEdgeById(
    name: string,
    source: string,
    target: string,
    propStrategy: 'merge' | 'replace' = 'merge',
    prop?: EdgePropDto,
  ) {
    if (!source || !target) {
      this.logger.warn(
        `Cannot create '${name}' edge: source (${source ?? 'missing'}) or target (${target ?? 'missing'}) is undefined`,
      );
      return;
    }

    const curr = await this.graphRepository.getEdgeByNameAndVertices(
      name,
      source,
      target,
    );
    if (curr) {
      const saveProps =
        propStrategy === 'replace'
          ? prop ?? {}
          : { ...(curr.prop ?? {}), ...prop };
      if (!deepEqual(curr.prop, saveProps, { strict: true })) {
        // Save prop changes
        await this.graphService.editEdge(null, curr.id.toString(), {
          name,
          source,
          target,
          prop: saveProps,
        });
        this.logger.debug(
          `Updated '${name}' edge properties from vertex ${source} to ${target}`,
        );
      } else {
        this.logger.debug(
          `Edge '${name}' from vertex ${source} to ${target} already exists with matching properties`,
        );
      }
      return curr;
    }

    // Edge doesn't exist, try to create it
    try {
      const newEdge = await this.graphService.addEdge(null, {
        name,
        source,
        target,
        ...(prop ? { prop } : {}),
      });
      this.logger.debug(
        `Created '${name}' edge from vertex ${source} to ${target}`,
      );
      return newEdge;
    } catch (e) {
      this.logger.warn(
        `Failed to create '${name}' edge from vertex ${source} to ${target}: ${e instanceof Error ? e.message : 'Unknown error'}`,
      );
    }
  }
}
