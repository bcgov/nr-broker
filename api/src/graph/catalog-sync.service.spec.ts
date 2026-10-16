import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CatalogComponentEntity } from '../catalog/catalog-component.entity';
import { CatalogSyncService } from './catalog-sync.service';
import { ProvenanceEmbeddable } from '../persistence/entity/provenance.embeddable';

describe('CatalogSyncService', () => {
  const repository = {
    name: 'repo',
    scmUrl: 'https://github.com/org/repo',
    description: 'org/repo',
  };
  const vertex = (id: string) => ({ id: { toString: () => id } });

  let auditService: { recordToolsSync: ReturnType<typeof vi.fn> };
  let collectionRepository: { getCollectionByKeyValue: ReturnType<typeof vi.fn> };
  let graphService: {
    addVertex: ReturnType<typeof vi.fn>;
    upsertVertex: ReturnType<typeof vi.fn>;
    addEdge: ReturnType<typeof vi.fn>;
  };
  let graphRepository: {
    getVertex: ReturnType<typeof vi.fn>;
    getVertexByName: ReturnType<typeof vi.fn>;
    getEdgeByNameAndVertices: ReturnType<typeof vi.fn>;
  };
  let service: CatalogSyncService;

  beforeEach(() => {
    auditService = { recordToolsSync: vi.fn() };
    collectionRepository = { getCollectionByKeyValue: vi.fn().mockResolvedValue(null) };
    graphService = {
      addVertex: vi.fn().mockImplementation(async (_req, dto) => vertex(dto.collection)),
      upsertVertex: vi.fn().mockResolvedValue(vertex('service')),
      addEdge: vi.fn(),
    };
    graphRepository = {
      getVertex: vi.fn(),
      getVertexByName: vi.fn().mockResolvedValue(null),
      getEdgeByNameAndVertices: vi.fn().mockResolvedValue(null),
    };
    service = new CatalogSyncService(
      auditService as any,
      collectionRepository as any,
      graphService as any,
      graphRepository as any,
    );
  });

  it('does nothing when there are no components', async () => {
    await service.syncRepository(repository, []);
    expect(auditService.recordToolsSync).not.toHaveBeenCalled();
    expect(collectionRepository.getCollectionByKeyValue).not.toHaveBeenCalled();
  });

  it('creates the repository, project, service and edges', async () => {
    await service.syncRepository(repository, [
      new CatalogComponentEntity('catalog-info.yaml', 'api', 'sys', 'API'),
      new CatalogComponentEntity('catalog-info.yaml', 'no-system'),
    ]);

    expect(graphService.addVertex.mock.calls.map((call) => call[1].collection)).toEqual([
      'repository',
      'project',
    ]);
    expect(graphService.upsertVertex).toHaveBeenCalledTimes(1);
    expect(graphService.upsertVertex.mock.calls[0][1].data).toEqual({
      name: 'api',
      title: 'API',
    });
    expect(
      graphService.addEdge.mock.calls.map((call) => [
        call[1].name,
        call[1].source,
        call[1].target,
      ]),
    ).toEqual([
      ['component', 'project', 'service'],
      ['source', 'service', 'repository'],
    ]);
    expect(auditService.recordToolsSync).toHaveBeenLastCalledWith(
      'end',
      'success',
      'End catalog sync: https://github.com/org/repo',
    );
  });

  it('passes the catalog file as provenance', async () => {
    await service.syncRepository(repository, [
      new CatalogComponentEntity('a/catalog-info.yaml', 'api', 'sys'),
    ]);

    const provenance = (record: ProvenanceEmbeddable) => [
      record.type,
      record.repository,
      record.path,
    ];
    const component = [
      'catalog',
      'https://github.com/org/repo',
      'a/catalog-info.yaml',
    ];
    expect(
      graphService.addVertex.mock.calls.map((call) => provenance(call[3])),
    ).toEqual([
      ['catalog', 'https://github.com/org/repo', 'catalog-info.yaml'],
      component,
    ]);
    expect(provenance(graphService.upsertVertex.mock.calls[0][4])).toEqual(
      component,
    );
    expect(
      graphService.addEdge.mock.calls.map((call) => provenance(call[2])),
    ).toEqual([component, component]);
  });

  it('records a failure and continues when a component fails', async () => {
    graphService.upsertVertex
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(vertex('service'));

    await service.syncRepository(repository, [
      new CatalogComponentEntity('a/catalog-info.yaml', 'a', 'sys'),
      new CatalogComponentEntity('b/catalog-info.yaml', 'b', 'sys'),
    ]);

    expect(graphService.upsertVertex).toHaveBeenCalledTimes(2);
    expect(auditService.recordToolsSync).toHaveBeenLastCalledWith(
      'end',
      'failure',
      'End catalog sync: https://github.com/org/repo',
    );
  });
});
