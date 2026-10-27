import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { shake } from 'radash';
import { AuditService } from '../../audit/audit.service';
import { CatalogComponent } from '../../catalog/catalog-component';
import { CatalogRepository } from '../../catalog/catalog-repository';
import { GITHUB_CATALOG_ROOT_FILE } from '../../constants';
import { CollectionNames } from '../../persistence/dto/collection-dto-union.type';
import { EdgeInsertDto } from '../../persistence/dto/edge.dto';
import { VertexInsertDto } from '../../persistence/dto/vertex.dto';
import { ProvenanceInfo } from '../../persistence/provenance-info';
import { VertexEntity } from '../../persistence/entity/vertex.entity';
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

  public async upsertProject(
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

  public async upsertService(
    component: CatalogComponent,
    provenance: ProvenanceInfo,
  ): Promise<VertexEntity> {
    const existing = await this.graphRepository.getVertexByName(
      'service',
      component.name,
    );
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
    await this.syncTags(service, component.tags);
    return service;
  }

  public async ensureEdge(
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
}
