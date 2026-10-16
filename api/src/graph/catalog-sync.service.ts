import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { shake } from 'radash';
import { AuditService } from '../audit/audit.service';
import { CatalogComponentEntity } from '../catalog/catalog-component.entity';
import { CatalogRepository } from '../catalog/catalog-repository';
import { GITHUB_CATALOG_ROOT_FILE } from '../constants';
import { CollectionNames } from '../persistence/dto/collection-dto-union.type';
import { EdgeInsertDto } from '../persistence/dto/edge.dto';
import { VertexInsertDto } from '../persistence/dto/vertex.dto';
import { ProvenanceEmbeddable } from '../persistence/entity/provenance.embeddable';
import { VertexEntity } from '../persistence/entity/vertex.entity';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { GraphService } from './graph.service';

/**
 * Records catalog components and their repository in the graph.
 */
@Injectable()
export class CatalogSyncService {
  private readonly logger = new Logger(CatalogSyncService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly collectionRepository: CollectionRepository,
    private readonly graphService: GraphService,
    private readonly graphRepository: GraphRepository,
  ) {}

  /**
   * Sync the components declared in a repository. A failure to sync one
   * component is logged and does not stop the others.
   */
  public async syncRepository(
    repository: CatalogRepository,
    components: CatalogComponentEntity[],
  ): Promise<void> {
    if (components.length === 0) {
      return;
    }

    this.auditService.recordToolsSync(
      'start',
      'unknown',
      `Start catalog sync: ${repository.scmUrl}`,
    );

    const repositoryVertex = await this.ensureRepository(repository);
    let failures = 0;
    for (const component of components) {
      try {
        await this.syncComponent(repository, component, repositoryVertex);
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
   * items are only updated if they were created by the same catalog file.
   */
  private async syncComponent(
    repository: CatalogRepository,
    component: CatalogComponentEntity,
    repositoryVertex: VertexEntity,
  ): Promise<void> {
    const provenance = ProvenanceEmbeddable.catalog(
      repository.scmUrl,
      component.path,
    );
    if (!component.system) {
      this.logger.warn(
        `Catalog component ${component.name} (${component.path}) has no spec.system; skipping`,
      );
      return;
    }

    const projectVertex = await this.ensureVertex(
      'project',
      component.system,
      { name: component.system },
      provenance,
    );
    const serviceVertex = await this.graphService.upsertVertex(
      null,
      plainToInstance(VertexInsertDto, {
        collection: 'service',
        data: shake({
          name: component.name,
          title: component.title,
          description: component.description,
          lifecycle: component.lifecycle,
          type: component.type,
        }),
      }),
      'name',
      null,
      provenance,
    );

    await this.ensureEdge('component', projectVertex, serviceVertex, provenance);
    await this.ensureEdge('source', serviceVertex, repositoryVertex, provenance);

    this.auditService.recordToolsSync(
      'info',
      'success',
      `Catalog synced service from ${component.path}`,
      component.system,
      component.name,
    );
  }

  /**
   * Find the repository by SCM URL (then name) and create it if missing. An
   * existing repository is left unchanged so sync settings are preserved.
   */
  private async ensureRepository(
    repository: CatalogRepository,
  ): Promise<VertexEntity> {
    const existing = await this.collectionRepository.getCollectionByKeyValue(
      'repository',
      'scmUrl',
      repository.scmUrl,
    );
    if (existing) {
      return this.graphRepository.getVertex(existing.vertex.toString());
    }
    return this.ensureVertex(
      'repository',
      repository.name,
      {
        name: repository.name,
        description: repository.description,
        type: 'git',
        scmUrl: repository.scmUrl,
        enableSyncSecrets: false,
        enableSyncUsers: false,
      },
      ProvenanceEmbeddable.catalog(repository.scmUrl, GITHUB_CATALOG_ROOT_FILE),
    );
  }

  private async ensureVertex(
    collection: CollectionNames,
    name: string,
    data: Record<string, unknown>,
    provenance: ProvenanceEmbeddable,
  ): Promise<VertexEntity> {
    const existing = await this.graphRepository.getVertexByName(
      collection,
      name,
    );
    if (existing) {
      return existing;
    }
    return this.graphService.addVertex(
      null,
      plainToInstance(VertexInsertDto, { collection, data }),
      true,
      provenance,
    );
  }

  private async ensureEdge(
    name: string,
    source: VertexEntity,
    target: VertexEntity,
    provenance: ProvenanceEmbeddable,
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
