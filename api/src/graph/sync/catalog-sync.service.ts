import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { shake } from 'radash';
import { AuditService } from '../../audit/audit.service';
import {
  CatalogComponent,
} from '../../catalog/catalog-component';
import { CatalogComponentInstance } from '../../catalog/catalog-component-instance';
import { CatalogRepository } from '../../catalog/catalog-repository';
import { GITHUB_CATALOG_ROOT_FILE } from '../../constants';
import { CollectionNames } from '../../persistence/dto/collection-dto-union.type';
import { EdgeInsertDto } from '../../persistence/dto/edge.dto';
import { ProvenanceType } from '../../persistence/dto/provenance.dto';
import { ProvenanceInfo } from '../../persistence/provenance-info';
import { VertexInsertDto } from '../../persistence/dto/vertex.dto';
import { ProvenanceEmbeddable } from '../../persistence/entity/provenance.embeddable';
import { VertexEntity } from '../../persistence/entity/vertex.entity';
import { CollectionRepository } from '../../persistence/interfaces/collection.repository';
import { GraphRepository } from '../../persistence/interfaces/graph.repository';
import {
  EnvironmentEntityMap,
  PersistenceUtilService,
} from '../../persistence/persistence-util.service';
import { GraphService } from '../graph.service';

interface UpsertOptions {
  /** Fallback values used when adding, below collection config defaults and catalog data */
  defaults?: Record<string, unknown>;
  /** Existing collection fields carried into an edit (for required fields) */
  keep?: string[];
  /** Vertex properties to save; defaults to the existing properties */
  prop?: Record<string, string>;
}

/**
 * Records catalog components, their repository, project and instances in the
 * graph.
 */
@Injectable()
export class CatalogSyncService {
  private readonly logger = new Logger(CatalogSyncService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly collectionRepository: CollectionRepository,
    private readonly graphService: GraphService,
    private readonly graphRepository: GraphRepository,
    private readonly persistenceUtilService: PersistenceUtilService,
  ) {}

  /**
   * Sync the components declared in a repository. A failure to sync one
   * component is logged and does not stop the others.
   */
  public async syncRepository(
    repository: CatalogRepository,
    components: CatalogComponent[],
  ): Promise<void> {
    if (components.length === 0) {
      return;
    }

    this.auditService.recordToolsSync(
      'start',
      'unknown',
      `Start catalog sync: ${repository.scmUrl}`,
    );

    const envMap = components.some((component) => component.instances?.length)
      ? await this.persistenceUtilService.getEnvMap()
      : {};
    const existingCollection =
      await this.collectionRepository.getCollectionByKeyValue(
        'repository',
        'scmUrl',
        repository.scmUrl,
      );
    const existingRepository = existingCollection
      ? await this.graphRepository.getVertex(
          existingCollection.vertex.toString(),
        )
      : null;
    const adoptable = await this.canAdopt(
      repository,
      components,
      existingRepository,
    );
    const repositoryVertex = await this.upsertRepository(
      repository,
      existingRepository,
      adoptable,
    );
    let failures = 0;
    for (const component of components) {
      try {
        await this.syncComponent(
          repository,
          component,
          repositoryVertex,
          envMap,
          adoptable,
        );
      } catch (error) {
        failures++;
        this.logger.warn(
          `Catalog sync failed for ${repository.scmUrl}:${component.path} (${component.name}): ${
            (error as Error).message
          }`,
        );
      }
    }

    this.auditService.recordToolsSync(
      'end',
      failures === 0 ? 'success' : 'failure',
      `End catalog sync: ${repository.scmUrl}`,
    );
  }

  /**
   * Items are created with the catalog file as their provenance. Existing
   * items are only updated if they were created by the same catalog file, or
   * if they can be adopted and have no catalog records.
   */
  private async syncComponent(
    repository: CatalogRepository,
    component: CatalogComponent,
    repositoryVertex: VertexEntity,
    envMap: EnvironmentEntityMap,
    adoptable: boolean,
  ): Promise<void> {
    const provenance = ProvenanceInfo.catalog(
      repository.scmUrl,
      component.path,
      { adoptable },
    );
    if (!component.system) {
      this.logger.warn(
        `Catalog component ${component.name} (${component.path}) has no spec.system; skipping`,
      );
      return;
    }

    const projectVertex = await this.upsertProject(
      component.system,
      provenance,
    );

    // Services are not linked unless this catalog file manages or adopts
    // them. Other edits are denied (and audited) by GraphService.
    const existingService = await this.graphRepository.getVertexByName(
      'service',
      component.name,
    );
    const serviceVertex = await this.upsertVertex(
      'service',
      existingService,
      {
        name: component.name,
        title: component.title,
        description: component.description,
        lifecycle: component.lifecycle,
        type: component.type,
      },
      provenance,
      { prop: this.buildServiceProp(existingService, component) },
    );

    await this.syncTags(serviceVertex, component.tags);
    await this.ensureEdge('component', projectVertex, serviceVertex, provenance);
    await this.ensureEdge('source', serviceVertex, repositoryVertex, provenance);
    if (component.instances) {
      await this.syncInstances(
        component.instances,
        serviceVertex,
        envMap,
        provenance,
      );
    }

    this.auditService.recordToolsSync(
      'info',
      'success',
      `Catalog synced service from ${component.path}`,
      component.system,
      component.name,
    );
  }

  /**
   * Whether the repository's catalog files can adopt existing items with no
   * catalog records. The repository must exist and be linked to a service, and
   * every existing service the catalog declares must look like it belongs to
   * this repository:
   * - Its only `source` edge is to this repository.
   * - No other catalog file manages it.
   * - Only one component in this repository declares it.
   * - It is in exactly one project, named by `spec.system`.
   */
  private async canAdopt(
    repository: CatalogRepository,
    components: CatalogComponent[],
    repositoryVertex: VertexEntity | null,
  ): Promise<boolean> {
    if (!repositoryVertex) {
      return false;
    }
    const repositoryId = repositoryVertex.id.toString();
    const linkedServices = await this.graphRepository.searchEdgesShallow(
      'source',
      undefined,
      repositoryId,
    );
    if (linkedServices.length === 0) {
      return false;
    }

    const block = (component: CatalogComponent, reason: string) => {
      this.logger.warn(
        `Catalog ${repository.scmUrl} cannot adopt existing items. Service ${component.name} (${component.path}): ${reason}`,
      );
      return false;
    };
    const declared = new Set<string>();
    for (const component of components) {
      if (!component.system) {
        continue;
      }
      if (declared.has(component.name)) {
        return block(
          component,
          'more than one component in this repository declares the service',
        );
      }
      declared.add(component.name);

      const service = await this.graphRepository.getVertexByName(
        'service',
        component.name,
      );
      if (!service) {
        continue;
      }
      const serviceId = service.id.toString();
      const record = ProvenanceEmbeddable.catalog(
        repository.scmUrl,
        component.path,
      );
      if (
        (service.provenance ?? []).some(
          (existing) =>
            existing.type === ProvenanceType.CATALOG &&
            !record.matches(existing),
        )
      ) {
        return block(component, 'the service is managed by another catalog file');
      }
      const sourceEdges = await this.graphRepository.searchEdgesShallow(
        'source',
        serviceId,
      );
      if (
        sourceEdges.length !== 1 ||
        sourceEdges[0].target.toString() !== repositoryId
      ) {
        return block(
          component,
          'the service must be linked to this repository and no other',
        );
      }
      const projectEdges = await this.graphRepository.searchEdgesShallow(
        'component',
        undefined,
        serviceId,
      );
      if (projectEdges.length !== 1) {
        return block(component, 'the service must be in exactly one project');
      }
      const project = await this.graphRepository.getVertex(
        projectEdges[0].source.toString(),
      );
      if (project?.name !== component.system) {
        return block(
          component,
          `the service is in project ${project?.name ?? 'unknown'}, not ${component.system}`,
        );
      }
    }
    return true;
  }

  /**
   * Add or update the repository. Sync settings are kept on update and
   * disabled on add.
   */
  private async upsertRepository(
    repository: CatalogRepository,
    existing: VertexEntity | null,
    adoptable: boolean,
  ): Promise<VertexEntity> {
    return this.upsertLinkedVertex(
      'repository',
      existing,
      {
        name: repository.name,
        description: repository.description,
        scmUrl: repository.scmUrl,
      },
      ProvenanceInfo.catalog(repository.scmUrl, GITHUB_CATALOG_ROOT_FILE, {
        adoptable,
      }),
      {
        defaults: {
          type: 'git',
          enableSyncSecrets: false,
          enableSyncUsers: false,
        },
        keep: ['enableSyncSecrets', 'enableSyncUsers'],
      },
    );
  }

  private async upsertProject(
    name: string,
    provenance: ProvenanceInfo,
  ): Promise<VertexEntity> {
    return this.upsertLinkedVertex(
      'project',
      await this.graphRepository.getVertexByName('project', name),
      { name },
      provenance,
    );
  }

  /**
   * Upsert a vertex that other items link to. An existing vertex not managed
   * by this catalog file, or one that fails to update, is still returned so
   * the catalog items can be linked to it.
   */
  private async upsertLinkedVertex(
    collection: CollectionNames,
    existing: VertexEntity | null,
    data: Record<string, unknown>,
    provenance: ProvenanceInfo,
    options: UpsertOptions = {},
  ): Promise<VertexEntity> {
    if (
      existing &&
      !this.graphService.isUpdateAllowed(existing.provenance, provenance)
    ) {
      this.logger.debug(
        `Catalog ${provenance.record.repository}:${provenance.record.path} does not manage ${collection} ${existing.name}; linking without update`,
      );
      return existing;
    }
    try {
      return await this.upsertVertex(
        collection,
        existing,
        data,
        provenance,
        options,
      );
    } catch (error) {
      if (!existing) {
        throw error;
      }
      this.logger.warn(
        `Catalog update failed for ${collection} ${existing.name}; linking without update: ${
          (error as Error).message
        }`,
      );
      return existing;
    }
  }

  /**
   * Add each instance under the service and link it to its environment.
   * Instances not managed by this catalog file are left unchanged. An instance
   * can only be in one environment, so an instance in another environment is
   * not changed. All instances are tried before any failure is reported.
   */
  private async syncInstances(
    instances: CatalogComponentInstance[],
    serviceVertex: VertexEntity,
    envMap: EnvironmentEntityMap,
    provenance: ProvenanceInfo,
  ): Promise<void> {
    const failures: string[] = [];
    for (const instance of instances) {
      try {
        const env = envMap[instance.env];
        if (!env) {
          throw new Error(`environment ${instance.env} does not exist`);
        }
        const existing = await this.graphRepository.getVertexByParentIdAndName(
          'serviceInstance',
          serviceVertex.id.toString(),
          instance.name,
        );
        if (
          existing &&
          !this.graphService.isUpdateAllowed(existing.provenance, provenance)
        ) {
          this.logger.debug(
            `Catalog ${provenance.record.repository}:${provenance.record.path} does not manage instance ${instance.name} of ${serviceVertex.name}; skipping`,
          );
          continue;
        }
        // Check the environment first so an instance in another environment
        // is not updated (or adopted)
        const envVertexId = env.vertex.toString();
        const deployTypes = existing
          ? await this.graphRepository.searchEdgesShallow(
              'deploy-type',
              existing.id.toString(),
            )
          : [];
        if (deployTypes.some((edge) => edge.target.toString() !== envVertexId)) {
          throw new Error(
            'the instance is already in another environment. Remove the instance in Broker or give it a new name.',
          );
        }
        const instanceVertex = await this.upsertVertex(
          'serviceInstance',
          existing,
          { name: instance.name, url: instance.url },
          provenance,
        );
        await this.ensureEdge(
          'instance',
          serviceVertex,
          instanceVertex,
          provenance,
        );
        if (deployTypes.length === 0) {
          await this.graphService.addEdge(
            null,
            plainToInstance(EdgeInsertDto, {
              name: 'deploy-type',
              source: instanceVertex.id.toString(),
              target: envVertexId,
            }),
            provenance,
          );
        }
      } catch (error) {
        failures.push(`${instance.name}: ${(error as Error).message}`);
      }
    }
    if (failures.length > 0) {
      throw new Error(`Instance sync failed (${failures.join('; ')})`);
    }
  }

  /**
   * Add the vertex if it does not exist, using collection config defaults for
   * values the catalog does not set. Otherwise, update the fields set by the
   * catalog and keep the rest.
   */
  private async upsertVertex(
    collection: CollectionNames,
    existing: VertexEntity | null,
    data: Record<string, unknown>,
    provenance: ProvenanceInfo,
    options: UpsertOptions = {},
  ): Promise<VertexEntity> {
    const catalogData = shake(data);
    if (!existing) {
      return this.graphService.addVertex(
        null,
        plainToInstance(VertexInsertDto, {
          collection,
          data: {
            ...options.defaults,
            ...(await this.getConfigDefaults(collection)),
            ...catalogData,
          },
          ...(options.prop ? { prop: options.prop } : {}),
        }),
        true,
        provenance,
      );
    }

    const kept: Record<string, unknown> = {};
    if (options.keep?.length) {
      const current = await this.collectionRepository.getCollectionByVertexId(
        collection,
        existing.id.toString(),
      );
      for (const key of options.keep) {
        if (current?.[key] !== undefined) {
          kept[key] = current[key];
        }
      }
    }
    const prop = options.prop ?? existing.prop;
    return this.graphService.editVertex(
      null,
      existing.id.toString(),
      plainToInstance(VertexInsertDto, {
        collection,
        data: { ...kept, ...catalogData },
        ...(prop && Object.keys(prop).length > 0 ? { prop } : {}),
      }),
      true,
      true,
      provenance,
    );
  }

  /**
   * Default field values from the collection config.
   */
  private async getConfigDefaults(
    collection: CollectionNames,
  ): Promise<Record<string, unknown>> {
    const config =
      await this.collectionRepository.getCollectionConfigByName(collection);
    const defaults: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(config?.fields ?? {})) {
      if (field?.value !== undefined) {
        defaults[key] = field.value;
      }
    }
    return defaults;
  }

  /**
   * Keep existing vertex properties and set owner when it is not blank.
   */
  private buildServiceProp(
    existing: VertexEntity | null,
    component: CatalogComponent,
  ): Record<string, string> | undefined {
    const prop = { ...(existing?.prop ?? {}) };
    const owner = component.owner?.trim();
    if (owner) {
      prop.owner = owner;
    }
    return Object.keys(prop).length > 0 ? prop : undefined;
  }

  /**
   * Replace the service tags with the catalog tags. Blank tags are dropped.
   */
  private async syncTags(
    serviceVertex: VertexEntity,
    tags: string[] | undefined,
  ): Promise<void> {
    if (!tags) {
      return;
    }
    const cleanTags = [
      ...new Set(
        tags.map((tag) => tag.replace(/[&<>"']/g, '').trim()).filter(Boolean),
      ),
    ];
    const service = await this.collectionRepository.getCollectionByVertexId(
      'service',
      serviceVertex.id.toString(),
    );
    if (service) {
      await this.collectionRepository.saveTags(
        'service',
        service.id.toString(),
        cleanTags,
      );
    }
  }

  private async ensureEdge(
    name: string,
    source: VertexEntity,
    target: VertexEntity,
    provenance: ProvenanceInfo,
  ): Promise<void> {
    const sourceId = source.id.toString();
    const targetId = target.id.toString();
    const existing = await this.graphRepository.getEdgeByNameAndVertices(
      name,
      sourceId,
      targetId,
    );
    if (existing) {
      return;
    }
    await this.graphService.addEdge(
      null,
      plainToInstance(EdgeInsertDto, {
        name,
        source: sourceId,
        target: targetId,
      }),
      provenance,
    );
  }
}
