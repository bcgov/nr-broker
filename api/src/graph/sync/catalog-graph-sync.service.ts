import { Injectable } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { shake } from 'radash';
import { AuditService } from '../../audit/audit.service';
import { CatalogComponent } from '../../catalog/catalog-component';
import { CatalogRepository } from '../../catalog/catalog-repository';
import { CatalogSystem } from '../../catalog/catalog-system';
import {
  CollectionBaseDtoUnion,
  CollectionBaseDtoUnionObject,
  CollectionNames,
} from '../../persistence/dto/collection-dto-union.type';
import { EdgeInsertDto } from '../../persistence/dto/edge.dto';
import { VertexInsertDto } from '../../persistence/dto/vertex.dto';
import { ProvenanceInfo } from '../../persistence/provenance-info';
import { VertexEntity } from '../../persistence/entity/vertex.entity';
import { EdgeEntity } from '../../persistence/entity/edge.entity';
import { ProvenanceType } from '../../persistence/dto/provenance.dto';
import { CollectionRepository } from '../../persistence/interfaces/collection.repository';
import { GraphRepository } from '../../persistence/interfaces/graph.repository';
import { GraphService } from '../graph.service';
import { SyncResult } from '../../persistence/dto/sync-status.dto';
import { syncFailure } from '../../util/sync-result.util';

interface UpsertOptions {
  /** Fallback values used when adding, below collection config defaults and catalog data */
  defaults?: Record<string, unknown>;
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
}

export interface CatalogEdgePlan {
  complete: boolean;
  edges: Map<string, CatalogPlannedEdge>;
  failures?: SyncResult[];
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
    provenance: ProvenanceInfo,
    plan?: CatalogEdgePlan,
  ): Promise<VertexEntity> {
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
        tags: repository.tags,
      },
      plan,
    );
  }

  public async getProject(name: string): Promise<VertexEntity | null> {
    return this.graphRepository.getVertexByName('project', name);
  }

  public async upsertProject(
    system: CatalogSystem,
    provenance: ProvenanceInfo,
    plan?: CatalogEdgePlan,
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
      plan,
    );
  }

  public async upsertService(
    component: CatalogComponent,
    provenance: ProvenanceInfo,
  ): Promise<VertexEntity> {
    const existing = await this.getService(component.name);
    const service = await this.graphService.upsertVertexById(
      await this.buildVertexInsert(
        'service',
        existing,
        {
          name: component.name,
          title: component.title,
          description: component.description,
          lifecycle: component.lifecycle,
          type: component.type,
        },
        { prop: this.buildServiceProp(existing, component) },
      ),
      existing?.id.toString() ?? null,
      provenance,
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
    options: { plan?: CatalogEdgePlan } = {},
  ): Promise<void> {
    const sourceId = source.id.toString();
    const targetId = target.id.toString();
    const existing = await this.graphRepository.getEdgeByNameAndVertices(
      name,
      sourceId,
      targetId,
    );
    if (options.plan) {
      options.plan.edges.set(this.edgeKey(name, sourceId, targetId), {
        name, source, target, provenance,
      });
      return;
    }
    if (existing) {
      await this.adoptEdge(
        existing,
        plainToInstance(EdgeInsertDto, {
          name,
          source: sourceId,
          target: targetId,
          prop: existing.prop,
        }),
        provenance,
      );
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

  private async adoptEdge(
    existing: EdgeEntity,
    edge: EdgeInsertDto,
    provenance: ProvenanceInfo,
  ): Promise<void> {
    if (!existing.provenance?.some((record) => provenance.record.matches(record))) {
      await this.graphService.editEdge(
        null,
        existing.id.toString(),
        edge,
        provenance,
      );
    }
  }

  public async reconcileEdges(
    repository: CatalogRepository,
    plan: CatalogEdgePlan,
  ): Promise<void> {
    const failures: SyncResult[] = [];
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
          const failure = syncFailure(error);
          failures.push({ ...failure, errorMessage: `delete ${edge.name} (${edge.id}): ${failure.errorMessage}` });
        }
      }
    }
    for (const edge of plan.edges.values()) {
      try {
        await this.ensureEdge(edge.name, edge.source, edge.target, edge.provenance);
      } catch (error) {
        const failure = syncFailure(error);
        failures.push({
          ...failure,
          errorMessage: `add ${edge.source.id} -> (${edge.name}) ${edge.target.id}: ${failure.errorMessage}`,
        });
      }
    }
    if (failures.length > 0) {
      throw Object.assign(
        new Error(`Catalog edge sync failed (${failures.map((failure) => failure.errorMessage).join('; ')})`, {
          cause: failures.find((failure) => failure.errorCode) ?? failures[0],
        }),
        { code: failures.find((failure) => failure.errorCode)?.errorCode },
      );
    }
  }

  private edgeKey(name: string, source: string, target: string): string {
    return JSON.stringify([name, source, target]);
  }

  /** Builds the vertex insert for adding or editing from catalog data */
  public async buildVertexInsert(
    collection: CollectionNames,
    existing: VertexEntity | null,
    data: Record<string, unknown>,
    options: UpsertOptions = {},
  ): Promise<VertexInsertDto> {
    const catalogData = shake(data);
    let vertexData: Record<string, unknown>;
    let prop = options.prop;
    if (!existing) {
      vertexData = {
        ...options.defaults,
        ...(await this.getConfigDefaults(collection)),
        ...catalogData,
      };
    } else {
      vertexData = catalogData;
      prop = prop ?? existing.prop;
    }

    const vertexInsert = new VertexInsertDto(
      collection,
      plainToInstance(
        CollectionBaseDtoUnionObject[collection] as ClassConstructor<
          CollectionBaseDtoUnion[CollectionNames]
        >,
        vertexData,
      ),
    );
    if (prop && Object.keys(prop).length > 0) {
      vertexInsert.prop = prop;
    }
    return vertexInsert;
  }

  private async upsertLinkedVertex(
    collection: CollectionNames,
    existing: VertexEntity | null,
    data: Record<string, unknown>,
    provenance: ProvenanceInfo,
    options: UpsertOptions = {},
    plan?: CatalogEdgePlan,
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
      vertex = await this.graphService.upsertVertexById(
        await this.buildVertexInsert(collection, existing, data, options),
        existing?.id.toString() ?? null,
        provenance,
      );
    } catch (error) {
      if (!existing) {
        throw error;
      }
      if (plan) {
        plan.failures?.push(syncFailure(error));
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
