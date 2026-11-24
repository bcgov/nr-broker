import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CatalogComponent } from '../../catalog/catalog-component';
import { CatalogEntity } from '../../catalog/catalog-entity';
import { CatalogSystem } from '../../catalog/catalog-system';
import { CatalogUtil } from '../../util/catalog.util';
import { CatalogSyncService } from './catalog-sync.service';
import { ProvenanceEmbeddable } from '../../persistence/entity/provenance.embeddable';
import { GraphService } from '../graph.service';
import { CatalogAdoptionService } from './catalog-adoption.service';
import { CatalogGraphSyncService } from './catalog-graph-sync.service';
import { CatalogInstanceSyncService } from './catalog-instance-sync.service';

describe('CatalogSyncService', () => {
  const repository = {
    name: 'repo',
    scmUrl: 'https://github.com/org/repo',
    description: 'org/repo',
  };
  const rootProvenance = ProvenanceEmbeddable.catalog(
    repository.scmUrl,
    'catalog-info.yaml',
  );
  const vertex = (
    id: string,
    extra: Record<string, unknown> = {},
  ): any => ({ id: { toString: () => id }, name: id, ...extra });
  const component = (
    path: string,
    name: string,
    system?: string,
    instances?: CatalogComponent['instances'],
  ) =>
    new CatalogComponent(
      path,
      name,
      system,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      instances,
    );
  const addedCollections = () =>
    graphService.addVertex.mock.calls.map((call) => call[1].collection);
  const edges = () =>
    graphService.addEdge.mock.calls.map((call) => [
      call[1].name,
      call[1].source,
      call[1].target,
    ]);

  let auditService: { recordGitHubCatalogSync: ReturnType<typeof vi.fn> };
  let collectionRepository: {
    getCollectionByKeyValue: ReturnType<typeof vi.fn>;
    getCollectionByVertexId: ReturnType<typeof vi.fn>;
    getCollectionConfigByName: ReturnType<typeof vi.fn>;
    saveTags: ReturnType<typeof vi.fn>;
  };
  let graphService: {
    addVertex: ReturnType<typeof vi.fn>;
    editVertex: ReturnType<typeof vi.fn>;
    upsertVertex: ReturnType<typeof vi.fn>;
    addEdge: ReturnType<typeof vi.fn>;
    editEdge: ReturnType<typeof vi.fn>;
    deleteEdge: ReturnType<typeof vi.fn>;
    isUpdateAllowed: ReturnType<typeof vi.fn>;
  };
  let graphRepository: {
    getVertex: ReturnType<typeof vi.fn>;
    getEdge: ReturnType<typeof vi.fn>;
    getCatalogEdges: ReturnType<typeof vi.fn>;
    getVertexByName: ReturnType<typeof vi.fn>;
    getVertexByParentIdAndName: ReturnType<typeof vi.fn>;
    getEdgeByNameAndVertices: ReturnType<typeof vi.fn>;
    searchEdgesShallow: ReturnType<typeof vi.fn>;
  };
  let persistenceUtilService: { getEnvMap: ReturnType<typeof vi.fn> };
  let service: CatalogSyncService;

  beforeEach(() => {
    const vertexCounts = new Map<string, number>();
    auditService = { recordGitHubCatalogSync: vi.fn() };
    collectionRepository = {
      getCollectionByKeyValue: vi.fn().mockResolvedValue(null),
      getCollectionByVertexId: vi.fn().mockResolvedValue({ id: 'svc-id' }),
      getCollectionConfigByName: vi.fn().mockResolvedValue({ fields: {} }),
      saveTags: vi.fn(),
    };
    graphService = {
      addVertex: vi
        .fn()
        .mockImplementation(async (_req, dto) => {
          const count = (vertexCounts.get(dto.collection) ?? 0) + 1;
          vertexCounts.set(dto.collection, count);
          return vertex(count === 1 ? dto.collection : `${dto.collection}-${count}`);
        }),
      editVertex: vi
        .fn()
        .mockImplementation(async (_req, id) => vertex(id)),
      upsertVertex: vi
        .fn()
        .mockImplementation(async (req, dto, _targetBy, target, provenance) =>
          target === null
            ? graphService.addVertex(req, dto, true, provenance)
            : graphService.editVertex(req, target, dto, true, true, provenance),
        ),
      addEdge: vi.fn(),
      editEdge: vi.fn(),
      deleteEdge: vi.fn(),
      isUpdateAllowed: vi
        .fn()
        .mockImplementation((records, provenance) =>
          GraphService.prototype.isUpdateAllowed(records, provenance),
        ),
    };
    graphRepository = {
      getVertex: vi.fn(),
      getEdge: vi.fn().mockResolvedValue(null),
      getCatalogEdges: vi.fn().mockResolvedValue([]),
      getVertexByName: vi.fn().mockResolvedValue(null),
      getVertexByParentIdAndName: vi.fn().mockResolvedValue(null),
      getEdgeByNameAndVertices: vi.fn().mockResolvedValue(null),
      searchEdgesShallow: vi.fn().mockResolvedValue([]),
    };
    persistenceUtilService = {
      getEnvMap: vi.fn().mockResolvedValue({
        production: { vertex: { toString: () => 'env-prod' } },
        prod: { vertex: { toString: () => 'env-prod' } },
      }),
    };
    const graphSyncService = new CatalogGraphSyncService(
      auditService as any,
      collectionRepository as any,
      graphService as any,
      graphRepository as any,
    );
    service = new CatalogSyncService(
      auditService as any,
      persistenceUtilService as any,
      new CatalogAdoptionService(graphRepository as any),
      graphSyncService,
      new CatalogInstanceSyncService(
        auditService as any,
        graphRepository as any,
        graphService as any,
        graphSyncService,
      ),
      new CatalogUtil(),
    );
  });

  it('does not create collections for an empty catalog', async () => {
    await service.syncRepository(repository, []);
    expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
      'end', 'success', 'Catalog sync completed: https://github.com/org/repo',
      expect.any(Object),
    );
    expect(collectionRepository.getCollectionByKeyValue).not.toHaveBeenCalled();
    expect(graphRepository.getCatalogEdges).toHaveBeenCalledWith(repository.scmUrl);
  });

  it('sets owner and filtered tags on the service', async () => {
    await service.syncRepository(repository, [
      new CatalogComponent(
        'catalog-info.yaml',
        'api',
        'sys',
        undefined,
        undefined,
        undefined,
        undefined,
        ['a', ' ', '', ' b ', 'a'],
        ' team ',
      ),
    ]);
    const serviceAdd = graphService.addVertex.mock.calls.find(
      (call) => call[1].collection === 'service',
    );
    expect(serviceAdd[1].data).toEqual({ name: 'api' });
    expect(serviceAdd[1].prop).toEqual({ owner: 'team' });
    expect(collectionRepository.saveTags).toHaveBeenCalledWith('service', 'svc-id', ['a', 'b']);
  });

  it('syncs repository tags from GitHub topics', async () => {
    await service.syncRepository(
      { ...repository, tags: ['broker', ' api ', 'broker'] },
      [component('catalog-info.yaml', 'api')],
    );

    expect(collectionRepository.saveTags).toHaveBeenCalledWith(
      'repository',
      'svc-id',
      ['broker', 'api'],
    );
  });

  it.each([{ tags: ['updated-topic'] }, { tags: [] }])('updates tags on an existing catalog-managed repository: $tags', async ({ tags }) => {
    collectionRepository.getCollectionByKeyValue.mockResolvedValue({
      vertex: 'existing-repo',
    });
    graphRepository.getVertex.mockResolvedValue(vertex('existing-repo', {
      collection: 'repository',
      provenance: [rootProvenance],
    }));
    collectionRepository.getCollectionByVertexId.mockResolvedValue({
      id: 'existing-repo-id',
      tags: ['old-topic'],
      enableSyncSecrets: true,
      enableSyncUsers: true,
    });

    await service.syncRepository(
      { ...repository, tags },
      [component('catalog-info.yaml', 'api')],
    );

    expect(collectionRepository.saveTags).toHaveBeenCalledWith(
      'repository', 'existing-repo-id', tags,
    );
    expect(graphService.editVertex).toHaveBeenCalledWith(
      null, 'existing-repo', expect.anything(), true, true, expect.anything(),
    );
  });

  it('does not create projects from component system references', async () => {
    const warn = vi.spyOn((service as any).logger, 'warn');
    await service.syncRepository(repository, [
      component('catalog-info.yaml', 'api', 'missing', [
        { env: 'production', name: 'blue', url: 'https://blue.example.gov.bc.ca' },
      ]),
    ]);

    expect(addedCollections()).toEqual(['repository', 'service', 'serviceInstance']);
    expect(edges()).not.toContainEqual(['component', 'project', 'service']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('add a kind: System document'));
  });

  it('links an existing project without a System declaration or project update', async () => {
    graphRepository.getVertexByName.mockImplementation(async (collection) =>
      collection === 'project' ? vertex('existing-project') : null,
    );

    await service.syncRepository(repository, [
      component('catalog-info.yaml', 'api', 'sys'),
    ]);

    expect(addedCollections()).toEqual(['repository', 'service']);
    expect(graphService.editVertex).not.toHaveBeenCalled();
    expect(edges()).toContainEqual(['component', 'existing-project', 'service']);
  });

  it('creates a project from a System without any components', async () => {
    await service.syncRepository(repository, [
      new CatalogSystem(
        'systems/catalog.yaml', 'sys', 'System title', 'System description',
        ['broker', ' api ', 'broker', '<tag>', ' '], 'natural-resources', 'platform',
      ),
    ]);

    expect(addedCollections()).toEqual(['repository', 'project']);
    expect(graphService.addVertex.mock.calls[1][1].data).toEqual({
      name: 'sys',
      title: 'System title',
      description: 'System description',
      domain: 'natural-resources',
      type: 'platform',
    });
    expect(collectionRepository.saveTags).toHaveBeenCalledWith(
      'project', 'svc-id', ['broker', 'api', 'tag'],
    );
    expect(graphService.addVertex.mock.calls[1][3].record.path).toBe('systems/catalog.yaml');
    expect(persistenceUtilService.getEnvMap).not.toHaveBeenCalled();
  });

  it('syncs a System once before components from other files and preserves its provenance', async () => {
    await service.syncRepository(repository, [
      component('api/catalog.yaml', 'api', 'sys'),
      component('ui/catalog.yaml', 'ui', 'sys'),
      new CatalogSystem('systems/catalog.yaml', 'sys'),
    ]);

    expect(addedCollections()).toEqual(['repository', 'project', 'service', 'service']);
    expect(graphService.addVertex.mock.calls[1][3].record.path).toBe('systems/catalog.yaml');
    expect(
      graphService.addEdge.mock.calls
        .filter((call) => call[1].name === 'component')
        .map((call) => call[2].record.path),
    ).toEqual(['api/catalog.yaml', 'ui/catalog.yaml']);
  });

  it('records a failed System sync and continues syncing other entities', async () => {
    graphService.addVertex.mockImplementation(async (_req, dto) => {
      if (dto.collection === 'project' && dto.data.name === 'broken') {
        throw new Error('Project write failed');
      }
      return vertex(dto.collection);
    });

    await service.syncRepository(repository, [
      new CatalogSystem('catalog-info.yaml', 'broken'),
      new CatalogSystem('catalog-info.yaml', 'sys'),
      component('catalog-info.yaml', 'api', 'broken'),
    ]);

    expect(addedCollections()).toEqual(['repository', 'project', 'project', 'service']);
    expect(edges()).toEqual([['source', 'service', 'repository']]);
    expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
      'end',
      'failure',
      expect.stringContaining('Catalog sync partially completed: https://github.com/org/repo'),
      expect.any(Object),
    );
  });

  it('creates the repository, project, service and edges', async () => {
    await service.syncRepository(repository, [
      new CatalogComponent('catalog-info.yaml', 'api', 'sys', 'API'),
      new CatalogComponent('catalog-info.yaml', 'no-system'),
      new CatalogSystem('catalog-info.yaml', 'sys'),
    ]);

    expect(addedCollections().sort()).toEqual(
      ['repository', 'project', 'service', 'service'].sort(),
    );
    const serviceAdd = graphService.addVertex.mock.calls.find(
      (call) => call[1].collection === 'service',
    );
    expect(serviceAdd?.[1].data).toEqual({
      name: 'api',
      title: 'API',
    });
    expect(edges().sort()).toEqual([
      ['component', 'project', 'service'],
      ['source', 'service', 'repository'],
      ['source', 'service-2', 'repository'],
    ].sort());
    expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
      'end',
      'success',
      'Catalog sync completed: https://github.com/org/repo',
      {
        repository: 'repo',
        repositoryUrl: 'https://github.com/org/repo',
      },
    );
  });

  it('adds with collection config defaults below catalog values', async () => {
    collectionRepository.getCollectionConfigByName.mockImplementation(
      async (collection) =>
        collection === 'repository'
          ? {
              fields: {
                enableSyncSecrets: { type: 'boolean', value: true },
                description: { type: 'description', value: 'default' },
                name: { type: 'string' },
              },
            }
          : { fields: {} },
    );

    await service.syncRepository(repository, [
      component('catalog-info.yaml', 'api', 'sys'),
    ]);

    expect(graphService.addVertex.mock.calls[0][1].data).toEqual({
      name: 'repo',
      description: 'org/repo',
      scmUrl: 'https://github.com/org/repo',
      type: 'git',
      enableSyncSecrets: true,
      enableSyncUsers: false,
    });
  });

  it('updates a managed repository without sending its sync settings', async () => {
    const existing = vertex('repo-vertex', {
      provenance: [rootProvenance],
      prop: { team: 'a' },
    });
    collectionRepository.getCollectionByKeyValue.mockResolvedValue({
      vertex: 'repo-vertex',
    });
    graphRepository.getVertex.mockResolvedValue(existing);
    collectionRepository.getCollectionByVertexId.mockImplementation(
      async (collection) =>
        collection === 'repository'
          ? { enableSyncSecrets: true, enableSyncUsers: false, type: 'svn' }
          : { id: 'svc-id' },
    );

    await service.syncRepository(repository, [
      component('catalog-info.yaml', 'api', 'sys'),
      new CatalogSystem('catalog-info.yaml', 'sys'),
    ]);

    const [, id, dto, , , provenance] = graphService.editVertex.mock.calls[0];
    expect(id).toBe('repo-vertex');
    expect(dto.data).toEqual({
      name: 'repo',
      description: 'org/repo',
      scmUrl: 'https://github.com/org/repo',
    });
    expect(dto.prop).toEqual({ team: 'a' });
    expect(provenance.record.path).toBe('catalog-info.yaml');
    expect(addedCollections().sort()).toEqual(['project', 'service'].sort());
  });

  it('links an unmanaged repository and project without updating them', async () => {
    collectionRepository.getCollectionByKeyValue.mockResolvedValue({
      vertex: 'repo-vertex',
    });
    graphRepository.getVertex.mockResolvedValue(vertex('repo-vertex'));
    graphRepository.getVertexByName.mockImplementation(async (collection) =>
      collection === 'project'
        ? vertex('project-vertex', {
            provenance: [ProvenanceEmbeddable.manual()],
          })
        : null,
    );

    await service.syncRepository(repository, [
      component('catalog-info.yaml', 'api', 'sys'),
      new CatalogSystem('catalog-info.yaml', 'sys', undefined, undefined, ['unmanaged'], 'unmanaged-domain', 'platform'),
    ]);

    expect(graphService.editVertex).not.toHaveBeenCalled();
    expect(collectionRepository.saveTags).not.toHaveBeenCalled();
    expect(addedCollections()).toEqual(['service']);
    expect(edges().sort()).toEqual([
      ['component', 'project-vertex', 'service'],
      ['source', 'service', 'repo-vertex'],
    ].sort());
    expect(auditService.recordGitHubCatalogSync).toHaveBeenCalledWith(
      'info',
      'unknown',
      'Catalog https://github.com/org/repo:catalog-info.yaml does not manage project project-vertex; linking without update',
      {
        repositoryUrl: repository.scmUrl,
        catalogPath: 'catalog-info.yaml',
      },
    );
  });

  it('audits a failed update before linking the existing vertex', async () => {
    graphRepository.getVertexByName.mockImplementation(async (collection) =>
      collection === 'project'
        ? vertex('project-vertex', {
            name: 'sys',
            provenance: [
              ProvenanceEmbeddable.catalog(
                repository.scmUrl,
                'catalog-info.yaml',
              ),
            ],
          })
        : null,
    );
    graphService.editVertex.mockRejectedValue(new Error('write unavailable'));

    const result = await service.syncRepository(repository, [
      component('catalog-info.yaml', 'api', 'sys'),
      new CatalogSystem('catalog-info.yaml', 'sys', undefined, undefined, ['failed'], 'failed-domain'),
    ]);

    expect(auditService.recordGitHubCatalogSync).toHaveBeenCalledWith(
      'info',
      'failure',
      'Catalog update failed for project sys; linking without update: write unavailable',
      expect.objectContaining({
        repositoryUrl: repository.scmUrl,
        catalogPath: 'catalog-info.yaml',
        failure: expect.any(Error),
      }),
    );
    expect(edges()).toContainEqual(['component', 'project-vertex', 'service']);
    expect(collectionRepository.saveTags).not.toHaveBeenCalled();
    expect(result).toEqual({
      state: 'partial',
      errorCode: 'CATALOG_SYNC_INCOMPLETE',
      errorMessage: 'write unavailable',
    });
  });

  it('propagates setup failures to the scan worker', async () => {
    collectionRepository.getCollectionByKeyValue.mockRejectedValue(new Error('Repository lookup failed'));

    await expect(service.syncRepository(repository, [component('catalog-info.yaml', 'api')])).rejects.toThrow('Repository lookup failed');
    expect(auditService.recordGitHubCatalogSync).not.toHaveBeenCalledWith(
      'end', expect.anything(), expect.anything(), expect.anything(),
    );
  });

  it.each([
    { tags: ['updated'], type: 'platform' },
    { tags: [], type: 'product' },
    { tags: undefined, type: undefined },
  ])('updates a project managed by the same catalog file: $tags, $type', async ({ tags, type }) => {
    graphRepository.getVertexByName.mockImplementation(async (collection) =>
      collection === 'project'
        ? vertex('project-vertex', {
            provenance: [
              ProvenanceEmbeddable.catalog(repository.scmUrl, 'a/catalog-info.yaml'),
            ],
          })
        : null,
    );

    await service.syncRepository(repository, [
      component('a/catalog-info.yaml', 'api', 'sys'),
      new CatalogSystem('a/catalog-info.yaml', 'sys', undefined, undefined, tags, 'domain:default/resources', type),
    ]);

    expect(graphService.editVertex.mock.calls.map((call) => call[1])).toEqual([
      'project-vertex',
    ]);
    expect(graphService.editVertex.mock.calls[0][2].data).toEqual({
      name: 'sys', domain: 'domain:default/resources', ...(type ? { type } : {}),
    });
    if (tags) {
      expect(collectionRepository.saveTags).toHaveBeenCalledWith('project', 'svc-id', tags);
    } else {
      expect(collectionRepository.saveTags).not.toHaveBeenCalled();
    }
  });

  it('passes the catalog file as provenance', async () => {
    await service.syncRepository(repository, [
      component('a/catalog-info.yaml', 'api', 'sys'),
      new CatalogSystem('a/catalog-info.yaml', 'sys'),
    ]);

    const provenance = (record: ProvenanceEmbeddable) => [
      record.type,
      record.repository,
      record.path,
    ];
    const file = ['catalog', 'https://github.com/org/repo', 'a/catalog-info.yaml'];
    expect(
      graphService.addVertex.mock.calls.map((call) => provenance(call[3].record)),
    ).toEqual([
      ['catalog', 'https://github.com/org/repo', 'catalog-info.yaml'],
      file,
      file,
    ]);
    expect(
      graphService.addEdge.mock.calls.map((call) => provenance(call[2].record)),
    ).toEqual([file, file]);
  });

  it('creates instances from YAML links and links them to their environment', async () => {
    await service.syncRepository(repository, [
      ...CatalogEntity.parseCatalogEntities(
        'catalog-info.yaml',
        [
          'kind: Component',
          'metadata:',
          '  name: api',
          '  links:',
          '    - type: instance',
          '      env: production',
          '      title: blue',
          '      url: https://blue.example.gov.bc.ca',
          '    - type: instance',
          '      env: prod',
          '      title: green',
          '      url: https://green.example.gov.bc.ca',
          '    - type: documentation',
          '      url: https://docs.example.gov.bc.ca',
          'spec:',
          '  system: sys',
        ].join('\n'),
        [CatalogComponent],
        new CatalogUtil(),
      ),
      new CatalogSystem('catalog-info.yaml', 'sys'),
    ]);

    const instanceAdds = graphService.addVertex.mock.calls
      .filter((call) => call[1].collection === 'serviceInstance')
      .map((call) => call[1].data);
    expect(instanceAdds).toEqual([
      { name: 'blue', url: 'https://blue.example.gov.bc.ca' },
      { name: 'green', url: 'https://green.example.gov.bc.ca' },
    ]);
    expect(edges().sort()).toEqual([
      ['component', 'project', 'service'],
      ['source', 'service', 'repository'],
      ['instance', 'service', 'serviceInstance'],
      ['deploy-type', 'serviceInstance', 'env-prod'],
      ['instance', 'service', 'serviceInstance-2'],
      ['deploy-type', 'serviceInstance-2', 'env-prod'],
    ].sort());
    expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
      'end',
      'success',
      'Catalog sync completed: https://github.com/org/repo',
      {
        repository: 'repo',
        repositoryUrl: 'https://github.com/org/repo',
      },
    );
  });

  it('does not load environments when no component has instances', async () => {
    await service.syncRepository(repository, [
      component('catalog-info.yaml', 'api', 'sys'),
    ]);
    expect(persistenceUtilService.getEnvMap).not.toHaveBeenCalled();
  });

  it('updates managed instances and skips unmanaged ones', async () => {
    const file = ProvenanceEmbeddable.catalog(repository.scmUrl, 'catalog-info.yaml');
    graphRepository.getVertexByParentIdAndName.mockImplementation(
      async (_collection, _parent, name) =>
        name === 'managed'
          ? vertex('managed', { provenance: [file] })
          : vertex('intention', { provenance: [ProvenanceEmbeddable.intention()] }),
    );
    graphRepository.searchEdgesShallow.mockResolvedValue([
      { target: { toString: () => 'env-prod' } },
    ]);
    graphRepository.getEdgeByNameAndVertices.mockImplementation(
      async (name) => (['instance', 'deploy-type'].includes(name) ? { id: 'edge' } : null),
    );

    await service.syncRepository(repository, [
      component('catalog-info.yaml', 'api', 'sys', [
        { env: 'production', name: 'managed', url: 'https://a.example.gov.bc.ca' },
        { env: 'production', name: 'other', url: 'https://other.example.gov.bc.ca' },
      ]),
      new CatalogSystem('catalog-info.yaml', 'sys'),
    ]);

    const instanceEdits = graphService.editVertex.mock.calls.filter(
      (call) => call[2].collection === 'serviceInstance',
    );
    expect(instanceEdits.map((call) => [call[1], call[2].data])).toEqual([
      ['managed', { name: 'managed', url: 'https://a.example.gov.bc.ca' }],
    ]);
    expect(edges().sort()).toEqual([
      ['component', 'project', 'service'],
      ['source', 'service', 'repository'],
    ].sort());
    expect(auditService.recordGitHubCatalogSync).toHaveBeenCalledWith(
      'info',
      'unknown',
      'Catalog https://github.com/org/repo:catalog-info.yaml does not manage instance other of service; skipping',
      {
        repositoryUrl: repository.scmUrl,
        catalogPath: 'catalog-info.yaml',
      },
    );
  });

  it('records a failure for unknown environments and syncs other instances', async () => {
    await service.syncRepository(repository, [
      component('catalog-info.yaml', 'api', 'sys', [
        { env: 'staging', name: 'staging', url: 'https://staging.example.gov.bc.ca' },
        { env: 'production', name: 'production', url: 'https://prod.example.gov.bc.ca' },
      ]),
    ]);

    expect(
      graphService.addVertex.mock.calls
        .filter((call) => call[1].collection === 'serviceInstance')
        .map((call) => call[1].data.name),
    ).toEqual(['production']);
    expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
      'end',
      'failure',
      expect.stringContaining('Catalog sync partially completed: https://github.com/org/repo'),
      expect.objectContaining({
        repository: 'repo',
        repositoryUrl: 'https://github.com/org/repo',
      }),
    );
  });

  it('does not move an instance to another environment', async () => {
    graphRepository.getVertexByParentIdAndName.mockResolvedValue(
      vertex('instance', { provenance: [rootProvenance] }),
    );
    graphRepository.searchEdgesShallow.mockResolvedValue([
      { target: { toString: () => 'env-test' } },
    ]);

    await service.syncRepository(repository, [
      component('catalog-info.yaml', 'api', 'sys', [
        { env: 'production', name: 'production', url: 'https://prod.example.gov.bc.ca' },
      ]),
    ]);

    expect(
      graphService.addEdge.mock.calls.some((call) => call[1].name === 'deploy-type'),
    ).toBe(false);
    expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
      'end',
      'failure',
      expect.stringContaining('Catalog sync partially completed: https://github.com/org/repo'),
      expect.objectContaining({
        repository: 'repo',
        repositoryUrl: 'https://github.com/org/repo',
      }),
    );
  });

  it('records a failure and continues when a component fails', async () => {
    graphService.addVertex.mockImplementation(async (_req, dto) => {
      if (dto.collection === 'service' && dto.data.name === 'a') {
        throw new Error('boom');
      }
      return vertex(dto.collection);
    });

    await service.syncRepository(repository, [
      component('a/catalog-info.yaml', 'a', 'sys'),
      component('b/catalog-info.yaml', 'b', 'sys'),
    ]);

    expect(
      graphService.addVertex.mock.calls
        .filter((call) => call[1].collection === 'service')
        .map((call) => call[1].data.name),
    ).toEqual(['a', 'b']);
    expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
      'end',
      'failure',
      expect.stringContaining('Catalog sync partially completed: https://github.com/org/repo'),
      expect.objectContaining({
        repository: 'repo',
        repositoryUrl: 'https://github.com/org/repo',
      }),
    );
  });

  describe('service relationships', () => {
    let savedServices: Map<string, ReturnType<typeof vertex>>;
    let savedEdges: Set<string>;
    const edgeKey = (name: string, source: string, target: string) => `${name}:${source}:${target}`;
    const parse = (documents: object[]) => CatalogEntity.parseCatalogEntities(
      'components/catalog.yaml',
      documents.map((document) => JSON.stringify(document)).join('\n---\n'),
      [CatalogComponent],
      new CatalogUtil(),
    );
    const declaringComponent = (spec: object = {}) => ({
      kind: 'Component',
      metadata: { name: 'child' },
      spec,
    });

    beforeEach(() => {
      savedServices = new Map([['external', vertex('external-service', { collection: 'service' })]]);
      savedEdges = new Set();
      collectionRepository.getCollectionConfigByName.mockResolvedValue({
        fields: {},
        edges: [
          { name: 'subcomponent-of', collection: 'service', restrict: true },
          { name: 'depends-on', collection: 'service', restrict: true },
        ],
      });
      graphService.addVertex.mockImplementation(async (_req, dto) => {
        const added = vertex(`${dto.collection}-${dto.data.name}`, { collection: dto.collection });
        if (dto.collection === 'service') {
          savedServices.set(dto.data.name, added);
        }
        return added;
      });
      graphService.editVertex.mockImplementation(async (_req, id) =>
        vertex(id, { collection: 'service' }),
      );
      graphRepository.getVertexByName.mockImplementation(async (collection, name) =>
        collection === 'service' ? savedServices.get(name) ?? null : null,
      );
      graphRepository.getEdgeByNameAndVertices.mockImplementation(async (name, source, target) =>
        savedEdges.has(edgeKey(name, source, target)) ? { id: 'existing-edge', restrict: true } : null,
      );
      graphService.addEdge.mockImplementation(async (_req, edge) => {
        savedEdges.add(edgeKey(edge.name, edge.source, edge.target));
      });
    });

    it('resolves forward and cross-repository references with catalog provenance and reuses edges', async () => {
      const components = parse([
        declaringComponent({
          subcomponentOf: 'component:default/parent',
          dependsOn: ['external', 'component:default/parent', 'external', 'default/external'],
        }),
        { kind: 'Component', metadata: { name: 'parent' } },
      ]);

      await service.syncRepository(repository, components);

      expect(edges()).toEqual(expect.arrayContaining([
        ['subcomponent-of', 'service-child', 'service-parent'],
        ['depends-on', 'service-child', 'external-service'],
        ['depends-on', 'service-child', 'service-parent'],
      ]));
      const relationshipCalls = () => graphService.addEdge.mock.calls.filter(
        (call) => ['subcomponent-of', 'depends-on'].includes(call[1].name),
      );
      expect(relationshipCalls()).toHaveLength(3);
      for (const call of relationshipCalls()) {
        expect(call[2].record).toMatchObject({
          repository: repository.scmUrl,
          path: 'components/catalog.yaml',
        });
      }

      await service.syncRepository(repository, components);
      expect(relationshipCalls()).toHaveLength(3);
    });

    it('warns about unsupported and missing targets without creating placeholder services', async () => {
      const warn = vi.spyOn((service as any).logger, 'warn');
      await service.syncRepository(repository, parse([
        declaringComponent({
          subcomponentOf: 'missing',
          dependsOn: ['resource:default/database', 'component:other/external', 'external'],
        }),
      ]));

      expect([...savedServices.keys()]).toEqual(['external', 'child']);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('references missing service missing'));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('unsupported depends-on reference resource:default/database'));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('unsupported depends-on reference component:other/external'));
      expect(edges()).toContainEqual(['depends-on', 'service-child', 'external-service']);
    });

    it.each([undefined, false])('does not create relationships when restrict is %s', async (restrict) => {
      collectionRepository.getCollectionConfigByName.mockResolvedValue({
        fields: {},
        edges: [{ name: 'depends-on', collection: 'service', restrict }],
      });
      const warn = vi.spyOn((service as any).logger, 'warn');
      await service.syncRepository(repository, parse([
        declaringComponent({ dependsOn: ['external'] }),
      ]));

      expect(edges().some(([name]) => name === 'depends-on')).toBe(false);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Configure depends-on as a restricted'));
      expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
        'end', 'failure', expect.any(String), expect.any(Object),
      );
    });

    it('records rejected relationships as failures and continues with other references', async () => {
      graphService.addEdge.mockImplementation(async (_req, edge) => {
        if (edge.name === 'subcomponent-of') {
          throw new Error('No edges to self');
        }
      });
      await service.syncRepository(repository, parse([
        declaringComponent({ subcomponentOf: 'child', dependsOn: ['external'] }),
      ]));

      expect(edges()).toContainEqual(['depends-on', 'service-child', 'external-service']);
      expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
        'end', 'failure', expect.any(String), expect.any(Object),
      );
    });

    it('reports an existing unrestricted relationship instead of silently reusing it', async () => {
      graphRepository.getEdgeByNameAndVertices.mockImplementation(async (name) =>
        name === 'depends-on' ? { id: 'unrestricted-edge', restrict: false } : null,
      );
      const warn = vi.spyOn((service as any).logger, 'warn');
      await service.syncRepository(repository, parse([
        declaringComponent({ dependsOn: ['external'] }),
      ]));

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Existing depends-on edge is not restricted'));
      expect(edges().some(([name]) => name === 'depends-on')).toBe(false);
      expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
        'end', 'failure', expect.any(String), expect.any(Object),
      );
    });

    it('does not sync outgoing relationships for a component whose service update fails', async () => {
      savedServices.set('child', vertex('existing-child'));
      graphService.editVertex.mockRejectedValue(new Error('Update denied'));

      await service.syncRepository(repository, parse([
        declaringComponent({ dependsOn: ['external'] }),
      ]));

      expect(graphService.addEdge).not.toHaveBeenCalled();
    });
  });

  describe('edge reconciliation', () => {
    interface StoredEdge {
      id: string;
      name: string;
      source: string;
      target: string;
      restrict: boolean;
      provenance: ProvenanceEmbeddable[];
    }

    let storedEdges: Map<string, StoredEdge>;
    let cascadedInstances: string[];
    const addStoredEdge = (
      id: string,
      name: string,
      source: string,
      target: string,
      provenance = [rootProvenance],
    ) => {
      storedEdges.set(id, { id, name, source, target, restrict: true, provenance });
    };

    beforeEach(() => {
      storedEdges = new Map();
      cascadedInstances = [];
      collectionRepository.getCollectionConfigByName.mockResolvedValue({
        fields: {},
        edges: [{ name: 'subcomponent-of', collection: 'service', restrict: true }],
      });
      graphService.addVertex.mockImplementation(async (_req, dto) =>
        vertex(dto.collection, { collection: dto.collection }),
      );
      graphRepository.getCatalogEdges.mockImplementation(async () => [...storedEdges.values()]);
      graphRepository.getEdge.mockImplementation(async (id) => storedEdges.get(id) ?? null);
      graphRepository.getEdgeByNameAndVertices.mockImplementation(async (name, source, target) =>
        [...storedEdges.values()].find((edge) =>
          edge.name === name && edge.source === source && edge.target === target,
        ) ?? null,
      );
      graphService.addEdge.mockImplementation(async (_req, edge, provenance) => {
        if (
          edge.name === 'subcomponent-of' &&
          [...storedEdges.values()].some((existing) =>
            existing.name === edge.name && existing.source === edge.source,
          )
        ) {
          throw new Error('One-to-one relation already exists');
        }
        addStoredEdge(`new-${edge.name}-${edge.target}`, edge.name, edge.source, edge.target, [provenance.record]);
      });
      graphService.editEdge.mockImplementation(async (_req, id, _edge, provenance) => {
        const existing = storedEdges.get(id);
        if (existing) {
          existing.provenance = provenance.mergeInto(existing.provenance);
        }
        return existing;
      });
      graphService.deleteEdge.mockImplementation(async (_req, id) => {
        const edge = storedEdges.get(id);
        storedEdges.delete(id);
        if (edge?.name === 'instance') {
          cascadedInstances.push(edge.target);
          for (const related of storedEdges.values()) {
            if (related.source === edge.target || related.target === edge.target) {
              storedEdges.delete(related.id);
            }
          }
        }
      });
    });

    it('removes stale catalog edges even with other provenance, but preserves desired and unrelated edges', async () => {
      addStoredEdge('source', 'source', 'service', 'repository');
      addStoredEdge('stale-dependency', 'depends-on', 'service', 'old-dependency', [
        ProvenanceEmbeddable.manual(),
        rootProvenance,
        ProvenanceEmbeddable.catalog('https://github.com/org/other', 'catalog-info.yaml'),
      ]);
      addStoredEdge('removed-file', 'component', 'project', 'removed-service', [
        ProvenanceEmbeddable.catalog(repository.scmUrl, 'removed/catalog-info.yaml'),
      ]);
      addStoredEdge('manual', 'depends-on', 'service', 'manual-dependency', [ProvenanceEmbeddable.manual()]);
      addStoredEdge('intention', 'depends-on', 'service', 'intention-dependency', [ProvenanceEmbeddable.intention()]);
      addStoredEdge('other-repository', 'depends-on', 'service', 'other-dependency', [
        ProvenanceEmbeddable.catalog('https://github.com/org/other', 'catalog-info.yaml'),
      ]);
      addStoredEdge('no-file', 'depends-on', 'service', 'unscoped-dependency', [
        ProvenanceEmbeddable.catalog(repository.scmUrl, ''),
      ]);

      await service.syncRepository(repository, [component('catalog-info.yaml', 'api')]);

      expect(graphService.deleteEdge.mock.calls).toEqual([
        [null, 'stale-dependency'],
        [null, 'removed-file'],
      ]);
      expect([...storedEdges.keys()]).toEqual([
        'source', 'manual', 'intention', 'other-repository', 'no-file',
      ]);
    });

    it('reports unresolved references without changing existing cleanup behavior', async () => {
      addStoredEdge('stale', 'depends-on', 'service', 'old-dependency');
      const declaration = new CatalogComponent(
        'catalog-info.yaml', 'api', undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined, ['resource:default/database'],
      );

      const result = await service.syncRepository(repository, [declaration]);

      expect(result).toMatchObject({
        state: 'partial',
        errorMessage: expect.stringContaining('Unsupported depends-on reference'),
      });
      expect(graphService.deleteEdge).toHaveBeenCalledWith(null, 'stale');
    });

    it('adds provenance to an existing desired edge when it is missing', async () => {
      addStoredEdge('source', 'source', 'service', 'repository', [
        ProvenanceEmbeddable.manual(),
      ]);

      await service.syncRepository(repository, [component('catalog-info.yaml', 'api')]);

      expect(graphService.editEdge).toHaveBeenCalledWith(
        null,
        'source',
        expect.objectContaining({
          name: 'source',
          source: 'service',
          target: 'repository',
        }),
        expect.objectContaining({
          record: expect.objectContaining({
            type: 'catalog',
            repository: repository.scmUrl,
            path: 'catalog-info.yaml',
          }),
        }),
      );
      expect(storedEdges.get('source')?.provenance).toHaveLength(2);
    });

    it('does not edit an existing desired edge when its provenance is already present', async () => {
      const provenance = ProvenanceEmbeddable.catalog(
        repository.scmUrl,
        'catalog-info.yaml',
      );
      addStoredEdge('source', 'source', 'service', 'repository', [provenance]);

      await service.syncRepository(repository, [component('catalog-info.yaml', 'api')]);

      expect(graphService.editEdge).not.toHaveBeenCalled();
      expect(storedEdges.get('source')?.provenance).toEqual([provenance]);
    });

    it('removes edges for an empty catalog without creating or directly deleting vertices', async () => {
      addStoredEdge('old-source', 'source', 'old-service', 'repository');

      await service.syncRepository(repository, []);

      expect(storedEdges.size).toBe(0);
      expect(graphService.deleteEdge).toHaveBeenCalledWith(null, 'old-source');
      expect(graphService.addVertex).not.toHaveBeenCalled();
      expect(cascadedInstances).toEqual([]);
    });

    it('allows normal instance cascades and skips edges already removed by the cascade', async () => {
      addStoredEdge('instance', 'instance', 'service', 'old-instance');
      addStoredEdge('environment', 'deploy-type', 'old-instance', 'env-prod');

      await service.syncRepository(repository, [component('catalog-info.yaml', 'api')]);

      expect(cascadedInstances).toEqual(['old-instance']);
      expect(graphService.deleteEdge.mock.calls).toEqual([[null, 'instance']]);
      expect(storedEdges.has('environment')).toBe(false);
      expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
        'end', 'success', expect.any(String), expect.any(Object),
      );
    });

    it('retains existing instance and environment edges while their link is still declared', async () => {
      addStoredEdge('instance', 'instance', 'service', 'existing-instance');
      addStoredEdge('environment', 'deploy-type', 'existing-instance', 'env-prod');
      graphRepository.getVertexByParentIdAndName.mockResolvedValue(
        vertex('existing-instance', { provenance: [rootProvenance] }),
      );
      graphRepository.searchEdgesShallow.mockImplementation(async (name) =>
        name === 'deploy-type' ? [storedEdges.get('environment')] : [],
      );

      await service.syncRepository(repository, [
        component('catalog-info.yaml', 'api', undefined, [
          { env: 'production', name: 'blue', url: 'https://blue.example.gov.bc.ca' },
        ]),
      ]);

      expect(graphService.deleteEdge).not.toHaveBeenCalled();
      expect(storedEdges.has('instance')).toBe(true);
      expect(storedEdges.has('environment')).toBe(true);
    });

    it('preserves desired edges when a declaration moves to another catalog file', async () => {
      addStoredEdge('source', 'source', 'service', 'repository', [
        ProvenanceEmbeddable.catalog(repository.scmUrl, 'old/catalog-info.yaml'),
      ]);

      await service.syncRepository(repository, [component('new/catalog-info.yaml', 'api')]);

      expect(graphService.deleteEdge).not.toHaveBeenCalled();
      expect(storedEdges.has('source')).toBe(true);
    });

    it('replaces an obsolete one-to-one parent before creating the new parent edge', async () => {
      addStoredEdge('old-parent', 'subcomponent-of', 'service', 'old-parent-service');
      graphRepository.getVertexByName.mockImplementation(async (collection, name) =>
        collection === 'service' && name === 'parent'
          ? vertex('new-parent-service', { collection: 'service' })
          : null,
      );
      const declaring = CatalogComponent.fromJson('catalog-info.yaml', {
        metadata: { name: 'api' },
        spec: { subcomponentOf: 'parent' },
      }, new CatalogUtil());

      await service.syncRepository(repository, [declaring]);

      expect(storedEdges.has('old-parent')).toBe(false);
      expect([...storedEdges.values()]).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'subcomponent-of', source: 'service', target: 'new-parent-service' }),
      ]));
      const parentAdd = graphService.addEdge.mock.calls.findIndex((call) => call[1].name === 'subcomponent-of');
      expect(graphService.deleteEdge.mock.invocationCallOrder[0])
        .toBeLessThan(graphService.addEdge.mock.invocationCallOrder[parentAdd]);
      expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
        'end', 'success', expect.any(String), expect.any(Object),
      );
    });

    it.each([{ components: [] }, { components: [component('catalog-info.yaml', 'api')] }])(
      'does not remove edges for an incomplete snapshot %j',
      async ({ components }) => {
        addStoredEdge('old-source', 'source', 'old-service', 'repository');

        await service.syncRepository(repository, components, false);

        expect(graphRepository.getCatalogEdges).not.toHaveBeenCalled();
        expect(graphService.deleteEdge).not.toHaveBeenCalled();
        expect(storedEdges.has('old-source')).toBe(true);
      },
    );

    it('does not remove edges when a component fails to sync', async () => {
      addStoredEdge('old-source', 'source', 'old-service', 'repository');
      graphService.addVertex.mockImplementation(async (_req, dto) => {
        if (dto.collection === 'service') {
          throw new Error('Service write failed');
        }
        return vertex(dto.collection);
      });

      await service.syncRepository(repository, [component('catalog-info.yaml', 'api')]);

      expect(graphRepository.getCatalogEdges).not.toHaveBeenCalled();
      expect(graphService.deleteEdge).not.toHaveBeenCalled();
      expect(storedEdges.has('old-source')).toBe(true);
    });

    it('reports deletion failures and continues applying other edge changes', async () => {
      addStoredEdge('stale', 'depends-on', 'service', 'old-target');
      graphService.deleteEdge.mockRejectedValue(new Error('Delete unavailable'));
      const warn = vi.spyOn((service as any).logger, 'warn');

      await service.syncRepository(repository, [component('catalog-info.yaml', 'api')]);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Delete unavailable'));
      expect([...storedEdges.values()]).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'source', source: 'service', target: 'repository' }),
      ]));
      expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
        'end', 'failure', expect.any(String), expect.any(Object),
      );
    });
  });

  describe('adoption', () => {
    const id = (value: string) => ({ toString: () => value });
    let vertices: Record<string, any>;
    let graphEdges: {
      id: { toString: () => string };
      name: string;
      source: string;
      target: string;
      provenance: ProvenanceEmbeddable[];
    }[];

    const addVertex = (
      key: string,
      collection: string,
      name: string,
      provenance: any[] = [ProvenanceEmbeddable.manual()],
    ) => {
      vertices[key] = { id: id(key), collection, name, provenance };
    };
    const editedIds = () => graphService.editVertex.mock.calls.map((call) => call[1]);
    // Vertices that now have a catalog record
    const catalogManaged = () =>
      Object.keys(vertices).filter((key) =>
        vertices[key].provenance.some((record) => record.type === 'catalog'),
      );

    beforeEach(() => {
      vertices = {};
      graphEdges = [
        {
          id: id('source-edge'),
          name: 'source',
          source: 'svc',
          target: 'repo-vertex',
          provenance: [ProvenanceEmbeddable.catalog(repository.scmUrl, 'a/catalog-info.yaml')],
        },
        {
          id: id('component-edge'),
          name: 'component',
          source: 'project-vertex',
          target: 'svc',
          provenance: [ProvenanceEmbeddable.catalog(repository.scmUrl, 'a/catalog-info.yaml')],
        },
        {
          id: id('instance-edge'),
          name: 'instance',
          source: 'svc',
          target: 'blue',
          provenance: [ProvenanceEmbeddable.catalog(repository.scmUrl, 'a/catalog-info.yaml')],
        },
        {
          id: id('deploy-type-edge'),
          name: 'deploy-type',
          source: 'blue',
          target: 'env-prod',
          provenance: [ProvenanceEmbeddable.catalog(repository.scmUrl, 'a/catalog-info.yaml')],
        },
      ];
      addVertex('repo-vertex', 'repository', 'repo');
      addVertex('svc', 'service', 'api');
      addVertex('project-vertex', 'project', 'sys');
      addVertex('blue', 'serviceInstance', 'blue', [ProvenanceEmbeddable.intention()]);

      collectionRepository.getCollectionByKeyValue.mockResolvedValue({ vertex: 'repo-vertex' });
      collectionRepository.getCollectionByVertexId.mockImplementation(async (collection) =>
        collection === 'repository'
          ? { enableSyncSecrets: true, enableSyncUsers: true }
          : { id: 'svc-id' },
      );
      // Enforce provenance like GraphService does
      graphService.editVertex.mockImplementation(async (_req, key, _dto, _a, _b, provenance) => {
        if (!GraphService.prototype.isUpdateAllowed(vertices[key].provenance, provenance)) {
          throw new Error('Update denied');
        }
        vertices[key].provenance = provenance.mergeInto(vertices[key].provenance);
        return vertices[key];
      });
      graphService.editEdge.mockImplementation(async (_req, key, _dto, provenance) => {
        const edge = graphEdges.find((current) => current.id.toString() === key);
        if (!edge || !GraphService.prototype.isUpdateAllowed(edge.provenance, provenance)) {
          throw new Error('Update denied');
        }
        edge.provenance = provenance.mergeInto(edge.provenance);
        return edge;
      });
      graphRepository.getVertex.mockImplementation(async (key) => vertices[key] ?? null);
      graphRepository.getVertexByName.mockImplementation(async (collection, name) =>
        Object.values(vertices).find((v) => v.collection === collection && v.name === name) ?? null,
      );
      graphRepository.getVertexByParentIdAndName.mockImplementation(async (collection, parent, name) =>
        Object.values(vertices).find(
          (v) =>
            v.collection === collection &&
            v.name === name &&
            graphEdges.some((e) => e.name === 'instance' && e.source === parent && e.target === v.id.toString()),
        ) ?? null,
      );
      graphRepository.searchEdgesShallow.mockImplementation(async (name, source, target) =>
        graphEdges
          .filter(
            (e) =>
              e.name === name &&
              (source === undefined || e.source === source) &&
              (target === undefined || e.target === target),
          )
          .map((e) => ({ name: e.name, source: id(e.source), target: id(e.target) })),
      );
      graphRepository.getEdgeByNameAndVertices.mockImplementation(async (name, source, target) =>
        graphEdges.find((e) => e.name === name && e.source === source && e.target === target) ?? null,
      );
    });

    const sync = (components = [
      component('a/catalog-info.yaml', 'api', 'sys', [
        { env: 'production', name: 'blue', url: 'https://blue.example.gov.bc.ca' },
      ]),
    ]) => service.syncRepository(repository, [
      ...components,
      new CatalogSystem('a/catalog-info.yaml', 'sys'),
    ]);

    it('adopts the repository, service, project and instances by updating them as adoptable', async () => {
      await sync();

      expect(editedIds().sort()).toEqual(
        ['repo-vertex', 'project-vertex', 'svc', 'blue'].sort(),
      );
      expect(graphService.editVertex.mock.calls.map((call) => call[5].adoptable)).toEqual([
        true,
        true,
        true,
        true,
      ]);
      expect(graphService.editVertex.mock.calls[0][5].record.path).toBe('catalog-info.yaml');
      expect(catalogManaged()).toEqual(['repo-vertex', 'svc', 'project-vertex', 'blue']);
      expect(graphService.addVertex).not.toHaveBeenCalled();
      expect(graphService.addEdge).not.toHaveBeenCalled();
      expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
        'end',
        'success',
        'Catalog sync completed: https://github.com/org/repo',
        {
          repository: 'repo',
          repositoryUrl: 'https://github.com/org/repo',
        },
      );
    });

    it('does not adopt a project without a System declaration', async () => {
      await service.syncRepository(repository, [
        component('a/catalog-info.yaml', 'api', 'sys', [
          { env: 'production', name: 'blue', url: 'https://blue.example.gov.bc.ca' },
        ]),
      ]);

      expect(editedIds().sort()).toEqual(['repo-vertex', 'svc', 'blue'].sort());
      expect(vertices['project-vertex'].provenance.map((record) => record.type)).toEqual(['manual']);
      expect(graphService.addVertex).not.toHaveBeenCalled();
    });

    it('adds the repository instead of matching by name when the SCM URL is not found', async () => {
      collectionRepository.getCollectionByKeyValue.mockResolvedValue(null);
      await sync();
      expect(graphRepository.getVertexByName).not.toHaveBeenCalledWith('repository', 'repo');
      expect(graphService.addVertex.mock.calls[0][1].collection).toBe('repository');
      expect(catalogManaged()).toEqual([]);
    });

    it('does not adopt the repository without a linked service', async () => {
      graphEdges = graphEdges.filter((e) => e.name !== 'source');
      await sync();
      expect(catalogManaged()).toEqual([]);
      // The service edit is attempted and denied by GraphService
      expect(editedIds()).toEqual(['svc']);
      expect(graphService.editVertex.mock.calls[0][5].adoptable).toBe(false);
    });

    it.each([
      [
        'the service is managed by another catalog file',
        () => {
          vertices.svc.provenance = [
            ProvenanceEmbeddable.catalog('https://github.com/org/other', 'catalog-info.yaml'),
          ];
        },
      ],
      [
        'the service is linked to more than one repository',
        () => {
          addVertex('other-repo', 'repository', 'other');
          graphEdges.push({
            id: id('other-source-edge'),
            name: 'source',
            source: 'svc',
            target: 'other-repo',
            provenance: [ProvenanceEmbeddable.manual()],
          });
        },
      ],
      [
        'the project does not match spec.system',
        () => {
          vertices['project-vertex'].name = 'other';
        },
      ],
      [
        'the service is in no project',
        () => {
          graphEdges = graphEdges.filter((e) => e.name !== 'component');
        },
      ],
    ])('does not adopt when %s', async (_reason, setup) => {
      setup();
      const before = catalogManaged();
      await sync();
      expect(catalogManaged()).toEqual(before);
    });

    it('does not adopt a service declared by more than one component', async () => {
      await sync([
        component('a/catalog-info.yaml', 'api', 'sys'),
        component('b/catalog-info.yaml', 'api', 'sys'),
      ]);
      expect(catalogManaged()).toEqual([]);
    });

    it('does not adopt anything when another declared service belongs elsewhere', async () => {
      addVertex('other-svc', 'service', 'other');
      await sync([
        component('a/catalog-info.yaml', 'api', 'sys'),
        component('b/catalog-info.yaml', 'other', 'sys'),
      ]);
      expect(catalogManaged()).toEqual([]);
      expect(graphService.editVertex.mock.calls.map((call) => call[5].adoptable)).toEqual([false, false]);
    });

    it('links a project managed by another catalog file without adopting it', async () => {
      vertices['project-vertex'].provenance = [
        ProvenanceEmbeddable.catalog('https://github.com/org/other', 'catalog-info.yaml'),
      ];
      await sync();
      expect(editedIds().sort()).toEqual(['repo-vertex', 'svc', 'blue'].sort());
    });

    it('does not adopt an instance in another environment', async () => {
      graphEdges.find((e) => e.name === 'deploy-type').target = 'env-test';
      await sync();
      expect(editedIds().sort()).toEqual(
        ['repo-vertex', 'project-vertex', 'svc'].sort(),
      );
      expect(vertices.blue.provenance.map((record) => record.type)).toEqual(['intention']);
    });

    it('adopts instances of a service already managed by the catalog file', async () => {
      vertices.svc.provenance = [
        ProvenanceEmbeddable.catalog(repository.scmUrl, 'a/catalog-info.yaml'),
      ];
      vertices['repo-vertex'].provenance = [
        ProvenanceEmbeddable.catalog(repository.scmUrl, 'catalog-info.yaml'),
      ];
      await sync();
      expect(editedIds()).toContain('blue');
      expect(vertices.blue.provenance.map((record) => record.type)).toEqual(['intention', 'catalog']);
    });
  });
});
