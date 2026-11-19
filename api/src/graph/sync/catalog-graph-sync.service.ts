import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { shake } from 'radash';
import { AuditService } from '../../audit/audit.service';
import { CatalogComponent } from '../../catalog/catalog-component';
import { CatalogRepository } from '../../catalog/catalog-repository';
import { CatalogSystem } from '../../catalog/catalog-system';
import { GITHUB_CATALOG_ROOT_FILE } from '../../constants';
import { CollectionNames } from '../../persistence/dto/collection-dto-union.type';
import { EdgeInsertDto } from '../../persistence/dto/edge.dto';
import { VertexInsertDto } from '../../persistence/dto/vertex.dto';
import { ProvenanceInfo } from '../../persistence/provenance-info';
import { VertexEntity } from '../../persistence/entity/vertex.entity';
import { ProvenanceType } from '../../persistence/dto/provenance.dto';
import { CollectionRepository } from '../../persistence/interfaces/collection.repository';
import { GraphRepository } from '../../persistence/interfaces/graph.repository';
import { GraphService } from '../graph.service';

interface UpsertOptions {
  /** Fallback values used when adding, below collection config defaults and catalog data */
  defaults?: Record<string, unknown>;
  /** Existing collection fields carried into an edit (for required fields) */
  keep?: string[];
  /** Vertex properties to save; defaults to the existing properties */
  prop?: Record<string, string>;
  tags?: string[];
}

type EdgeVertex = Pick<VertexEntity, 'id' | 'collection'>;

interface CatalogPlannedEdge {
  name: string;
  source: EdgeVertex;
  target: EdgeVertex;
  provenance: ProvenanceInfo;
  restricted?: boolean;
}

export interface CatalogEdgePlan {
  complete: boolean;
  edges: Map<string, CatalogPlannedEdge>;
}

@Injectable()
export class CatalogGraphSyncService {
  constructor(
    private readonly auditService: AuditService,
    private readonly collectionRepository: CollectionRepository,
    private readonly graphService: GraphService,
    private readonly graphRepository: GraphRepository,
  ) {}

  public async getRepository(scmUrl: string): Promise<VertexEntity | null> {
    const collection = await this.collectionRepository.getCollectionByKeyValue(
      'repository',
      'scmUrl',
      scmUrl,
    );
    return collection
      ? this.graphRepository.getVertex(collection.vertex.toString())
      : null;
  }

  public async upsertRepository(
    repository: CatalogRepository,
    existing: VertexEntity | null,
    adoptable: boolean,
  ): Promise<VertexEntity> {
    const provenance = ProvenanceInfo.catalog(
      repository.scmUrl,
      GITHUB_CATALOG_ROOT_FILE,
      { adoptable },
    );
    return this.upsertLinkedVertex(
      'repository',
      existing,
      {
        name: repository.name,
        description: repository.description,
        scmUrl: repository.scmUrl,
      },
      provenance,
      {
        defaults: {
          type: 'git',
          enableSyncSecrets: false,
          enableSyncUsers: false,
        },
        keep: ['enableSyncSecrets', 'enableSyncUsers'],
        tags: repository.tags,
      },
    );
  }

  public async getProject(name: string): Promise<VertexEntity | null> {
    return this.graphRepository.getVertexByName('project', name);
  }

  public async upsertProject(
    system: CatalogSystem,
    provenance: ProvenanceInfo,
  ): Promise<VertexEntity> {
    return this.upsertLinkedVertex(
      'project',
      await this.getProject(system.name),
      {
        name: system.name,
        title: system.title,
        description: system.description,
        domain: system.domain,
        type: system.type,
      },
      provenance,
      { tags: system.tags },
    );
  }

  public async upsertService(
    component: CatalogComponent,
    provenance: ProvenanceInfo,
  ): Promise<VertexEntity> {
    const existing = await this.getService(component.name);
    const service = await this.upsertVertex(
      'service',
      existing,
      {
        name: component.name,
        title: component.title,
        description: component.description,
        lifecycle: component.lifecycle,
        type: component.type,
      },
      provenance,
      { prop: this.buildServiceProp(existing, component) },
    );
    await this.syncTags('service', service, component.tags);
    return service;
  }

  public async getService(name: string): Promise<VertexEntity | null> {
    return this.graphRepository.getVertexByName('service', name);
  }

  public async ensureEdge(
    name: string,
    source: EdgeVertex,
    target: EdgeVertex,
    provenance: ProvenanceInfo,
    options: { restricted?: boolean; plan?: CatalogEdgePlan } = {},
  ): Promise<void> {
    if (options.restricted) {
      const config = await this.collectionRepository.getCollectionConfigByName(source.collection);
      const edge = config?.edges?.find(
        (candidate) => candidate.name === name && candidate.collection === target.collection,
      );
      if (edge?.restrict !== true) {
        throw new Error(
          `Configure ${name} as a restricted Service-to-Service edge. Run scripts/db/mongo-add-service-catalog-edges.js and reindex the graph cache, then retry.`,
        );
      }
    }
    const sourceId = source.id.toString();
    const targetId = target.id.toString();
    const existing = await this.graphRepository.getEdgeByNameAndVertices(
      name,
      sourceId,
      targetId,
    );
    if (existing && options.restricted && existing.restrict !== true) {
      throw new Error(
        `Existing ${name} edge is not restricted. Run scripts/db/mongo-add-service-catalog-edges.js and reindex the graph cache, then retry.`,
      );
    }
    if (options.plan) {
      options.plan.edges.set(this.edgeKey(name, sourceId, targetId), {
        name, source, target, provenance, restricted: options.restricted,
      });
      return;
    }
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

  public async reconcileEdges(
    repository: CatalogRepository,
    plan: CatalogEdgePlan,
  ): Promise<void> {
    const failures: string[] = [];
    if (plan.complete) {
      const edges = await this.graphRepository.getCatalogEdges(repository.scmUrl);
      for (const edge of edges) {
        if (
          !edge.provenance?.some((record) =>
            record.type === ProvenanceType.CATALOG &&
            record.repository === repository.scmUrl &&
            typeof record.path === 'string' &&
            record.path !== '',
          ) ||
          plan.edges.has(this.edgeKey(edge.name, edge.source.toString(), edge.target.toString()))
        ) {
          continue;
        }
        try {
          if (await this.graphRepository.getEdge(edge.id.toString())) {
            await this.graphService.deleteEdge(null, edge.id.toString());
          }
        } catch (error) {
          failures.push(`delete ${edge.name} (${edge.id}): ${(error as Error).message}`);
        }
      }
    }
    for (const edge of plan.edges.values()) {
      try {
        await this.ensureEdge(edge.name, edge.source, edge.target, edge.provenance, {
          restricted: edge.restricted,
        });
      } catch (error) {
        failures.push(
          `add ${edge.name} (${edge.source.id} -> ${edge.target.id}): ${(error as Error).message}`,
        );
      }
    }
    if (failures.length > 0) {
      throw new Error(`Catalog edge sync failed (${failures.join('; ')})`);
    }
  }

  private edgeKey(name: string, source: string, target: string): string {
    return JSON.stringify([name, source, target]);
  }

  public async upsertVertex(
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
      this.auditService.recordGitHubCatalogSync(
        'info',
        'unknown',
        `Catalog ${provenance.record.repository}:${provenance.record.path} does not manage ${collection} ${existing.name}; linking without update`,
        {
          repositoryUrl: provenance.record.repository,
          catalogPath: provenance.record.path,
        },
      );
      return existing;
    }
    let vertex: VertexEntity;
    try {
      vertex = await this.upsertVertex(
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
      this.auditService.recordGitHubCatalogSync(
        'info',
        'failure',
        `Catalog update failed for ${collection} ${existing.name}; linking without update: ${
          (error as Error).message
        }`,
        {
          repositoryUrl: provenance.record.repository,
          catalogPath: provenance.record.path,
          failure: error,
        },
      );
      return existing;
    }
    await this.syncTags(collection, vertex, options.tags);
    return vertex;
  }

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

  private async syncTags(
    collection: CollectionNames,
    vertex: VertexEntity,
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
    const entity = await this.collectionRepository.getCollectionByVertexId(
      collection,
      vertex.id.toString(),
    );
    if (entity) {
      await this.collectionRepository.saveTags(
        collection,
        entity.id.toString(),
        cleanTags,
      );
    }
  }
}
