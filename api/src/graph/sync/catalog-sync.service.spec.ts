import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CatalogComponent } from '../../catalog/catalog-component';
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
    addEdge: ReturnType<typeof vi.fn>;
    isUpdateAllowed: ReturnType<typeof vi.fn>;
  };
  let graphRepository: {
    getVertex: ReturnType<typeof vi.fn>;
    getVertexByName: ReturnType<typeof vi.fn>;
    getVertexByParentIdAndName: ReturnType<typeof vi.fn>;
    getEdgeByNameAndVertices: ReturnType<typeof vi.fn>;
    searchEdgesShallow: ReturnType<typeof vi.fn>;
  };
  let persistenceUtilService: { getEnvMap: ReturnType<typeof vi.fn> };
  let service: CatalogSyncService;

  beforeEach(() => {
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
        .mockImplementation(async (_req, dto) => vertex(dto.collection)),
      editVertex: vi
        .fn()
        .mockImplementation(async (_req, id) => vertex(id)),
      addEdge: vi.fn(),
      isUpdateAllowed: vi
        .fn()
        .mockImplementation((records, provenance) =>
          GraphService.prototype.isUpdateAllowed(records, provenance),
        ),
    };
    graphRepository = {
      getVertex: vi.fn(),
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
    );
  });

  it('does nothing when there are no components', async () => {
    await service.syncRepository(repository, []);
    expect(auditService.recordGitHubCatalogSync).not.toHaveBeenCalled();
    expect(collectionRepository.getCollectionByKeyValue).not.toHaveBeenCalled();
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

  it('creates the repository, project, service and edges', async () => {
    await service.syncRepository(repository, [
      new CatalogComponent('catalog-info.yaml', 'api', 'sys', 'API'),
      new CatalogComponent('catalog-info.yaml', 'no-system'),
    ]);

    expect(addedCollections()).toEqual(['repository', 'project', 'service']);
    expect(graphService.addVertex.mock.calls[2][1].data).toEqual({
      name: 'api',
      title: 'API',
    });
    expect(edges()).toEqual([
      ['component', 'project', 'service'],
      ['source', 'service', 'repository'],
    ]);
    expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
      'end',
      'success',
      'End catalog sync: https://github.com/org/repo',
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

  it('updates a managed repository and keeps its sync settings', async () => {
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
    ]);

    const [, id, dto, , , provenance] = graphService.editVertex.mock.calls[0];
    expect(id).toBe('repo-vertex');
    expect(dto.data).toEqual({
      name: 'repo',
      description: 'org/repo',
      scmUrl: 'https://github.com/org/repo',
      enableSyncSecrets: true,
      enableSyncUsers: false,
    });
    expect(dto.prop).toEqual({ team: 'a' });
    expect(provenance.record.path).toBe('catalog-info.yaml');
    expect(addedCollections()).toEqual(['project', 'service']);
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
    ]);

    expect(graphService.editVertex).not.toHaveBeenCalled();
    expect(addedCollections()).toEqual(['service']);
    expect(edges()).toEqual([
      ['component', 'project-vertex', 'service'],
      ['source', 'service', 'repo-vertex'],
    ]);
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

    await service.syncRepository(repository, [
      component('catalog-info.yaml', 'api', 'sys'),
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
  });

  it('updates a project managed by the same catalog file', async () => {
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
    ]);

    expect(graphService.editVertex.mock.calls.map((call) => call[1])).toEqual([
      'project-vertex',
    ]);
    expect(graphService.editVertex.mock.calls[0][2].data).toEqual({ name: 'sys' });
  });

  it('passes the catalog file as provenance', async () => {
    await service.syncRepository(repository, [
      component('a/catalog-info.yaml', 'api', 'sys'),
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

  it('creates instances and links them to their environment', async () => {
    await service.syncRepository(repository, [
      component('catalog-info.yaml', 'api', 'sys', [
        { env: 'production', name: 'blue', url: 'https://blue.example.gov.bc.ca' },
        { env: 'prod', name: 'green' },
      ]),
    ]);

    const instanceAdds = graphService.addVertex.mock.calls
      .filter((call) => call[1].collection === 'serviceInstance')
      .map((call) => call[1].data);
    expect(instanceAdds).toEqual([
      { name: 'blue', url: 'https://blue.example.gov.bc.ca' },
      { name: 'green' },
    ]);
    expect(edges()).toEqual([
      ['component', 'project', 'service'],
      ['source', 'service', 'repository'],
      ['instance', 'service', 'serviceInstance'],
      ['deploy-type', 'serviceInstance', 'env-prod'],
      ['instance', 'service', 'serviceInstance'],
      ['deploy-type', 'serviceInstance', 'env-prod'],
    ]);
    expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
      'end',
      'success',
      'End catalog sync: https://github.com/org/repo',
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
      async (name) => (name === 'instance' ? { id: 'edge' } : null),
    );

    await service.syncRepository(repository, [
      component('catalog-info.yaml', 'api', 'sys', [
        { env: 'production', name: 'managed', url: 'https://a.example.gov.bc.ca' },
        { env: 'production', name: 'other' },
      ]),
    ]);

    const instanceEdits = graphService.editVertex.mock.calls.filter(
      (call) => call[2].collection === 'serviceInstance',
    );
    expect(instanceEdits.map((call) => [call[1], call[2].data])).toEqual([
      ['managed', { name: 'managed', url: 'https://a.example.gov.bc.ca' }],
    ]);
    expect(edges()).toEqual([
      ['component', 'project', 'service'],
      ['source', 'service', 'repository'],
    ]);
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
        { env: 'staging', name: 'staging' },
        { env: 'production', name: 'production' },
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
      'End catalog sync: https://github.com/org/repo',
      {
        repository: 'repo',
        repositoryUrl: 'https://github.com/org/repo',
      },
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
      component('catalog-info.yaml', 'api', 'sys', [{ env: 'production', name: 'production' }]),
    ]);

    expect(
      graphService.addEdge.mock.calls.some((call) => call[1].name === 'deploy-type'),
    ).toBe(false);
    expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
      'end',
      'failure',
      'End catalog sync: https://github.com/org/repo',
      {
        repository: 'repo',
        repositoryUrl: 'https://github.com/org/repo',
      },
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
      'End catalog sync: https://github.com/org/repo',
      {
        repository: 'repo',
        repositoryUrl: 'https://github.com/org/repo',
      },
    );
  });
  describe('adoption', () => {
    const id = (value: string) => ({ toString: () => value });
    let vertices: Record<string, any>;
    let graphEdges: { name: string; source: string; target: string }[];

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
        { name: 'source', source: 'svc', target: 'repo-vertex' },
        { name: 'component', source: 'project-vertex', target: 'svc' },
        { name: 'instance', source: 'svc', target: 'blue' },
        { name: 'deploy-type', source: 'blue', target: 'env-prod' },
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
    ]) => service.syncRepository(repository, components);

    it('adopts the repository, service, project and instances by updating them as adoptable', async () => {
      await sync();

      expect(editedIds()).toEqual(['repo-vertex', 'project-vertex', 'svc', 'blue']);
      expect(graphService.editVertex.mock.calls.map((call) => call[5].adoptable)).toEqual([
        true,
        true,
        true,
        true,
      ]);
      expect(graphService.editVertex.mock.calls[0][5].record.path).toBe('catalog-info.yaml');
      expect(graphService.editVertex.mock.calls[0][2].data).toMatchObject({
        enableSyncSecrets: true,
        enableSyncUsers: true,
      });
      expect(catalogManaged()).toEqual(['repo-vertex', 'svc', 'project-vertex', 'blue']);
      expect(graphService.addVertex).not.toHaveBeenCalled();
      expect(graphService.addEdge).not.toHaveBeenCalled();
      expect(auditService.recordGitHubCatalogSync).toHaveBeenLastCalledWith(
        'end',
        'success',
        'End catalog sync: https://github.com/org/repo',
        {
          repository: 'repo',
          repositoryUrl: 'https://github.com/org/repo',
        },
      );
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
          graphEdges.push({ name: 'source', source: 'svc', target: 'other-repo' });
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
      expect(editedIds()).toEqual(['repo-vertex', 'svc', 'blue']);
    });

    it('does not adopt an instance in another environment', async () => {
      graphEdges.find((e) => e.name === 'deploy-type').target = 'env-test';
      await sync();
      expect(editedIds()).toEqual(['repo-vertex', 'project-vertex', 'svc']);
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
