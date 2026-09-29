import { beforeEach, describe, expect, it } from 'vitest';
import { OnboardingService } from './onboarding.service';
import { OnboardingManifestDto } from './dto/onboarding-manifest.dto';

/**
 * In-memory stand-in for the Broker graph: vertices by collection + name, and
 * edges by name + source + target. Service instances are found by parent
 * (the `instance` edge), as Broker does.
 */
class FakeGraph {
  private seq = 0;
  vertices: { id: string; collection: string; name: string; data: any }[] = [];
  edges: { id: string; name: string; source: string; target: string }[] = [];
  created: string[] = [];

  addV(collection: string, name: string, data: any = {}) {
    const id = `v${++this.seq}`;
    this.vertices.push({ id, collection, name, data: { name, ...data } });
    return id;
  }

  addE(name: string, source: string, target: string) {
    const id = `e${++this.seq}`;
    this.edges.push({ id, name, source, target });
    return id;
  }

  graphRepository = {
    getVertexByName: async (collection: string, name: string) =>
      this.vertices.find((v) => v.collection === collection && v.name === name) ?? null,
    getEdgeByNameAndVertices: async (name: string, source: string, target: string) =>
      this.edges.find((e) => e.name === name && e.source === source && e.target === target) ?? null,
    getVertexByParentIdAndName: async (collection: string, parentId: string, name: string) =>
      this.vertices.find(
        (v) =>
          v.collection === collection &&
          v.name === name &&
          this.edges.some((e) => e.source === parentId && e.target === v.id),
      ) ?? null,
  };
  collectionRepository = {
    getCollectionByKeyValue: async (collection: string, _key: string, value: string) => {
      const v = this.vertices.find((x) => x.collection === collection && x.name === value);
      return v ? { ...v.data, vertex: v.id } : null;
    },
  };
  graphService = {
    addVertex: async (_req: any, dto: any) => {
      const id = this.addV(dto.collection, dto.data.name, dto.data);
      this.created.push(`${dto.collection}:${dto.data.name}`);
      return { id };
    },
    addEdge: async (_req: any, dto: any) => {
      const id = this.addE(dto.name, dto.source, dto.target);
      this.created.push(`edge:${dto.name}`);
      return { id };
    },
  };
}

const manifest = (over: Partial<OnboardingManifestDto> = {}): OnboardingManifestDto =>
  ({
    project: { name: 'ata', title: 'ATA' },
    service: { name: 'ata-war' },
    environments: ['development', 'test', 'production'],
    repository: { name: 'nr-ata', scmUrl: 'https://github.com/bcgov-c/nr-ata' },
    ...over,
  }) as OnboardingManifestDto;

const tokenReq = { headers: { authorization: 'Bearer x' }, user: { jti: 'jti-1' } } as any;
const adminReq = { headers: {}, user: { userinfo: {} } } as any;

describe('OnboardingService', () => {
  let g: FakeGraph;
  let service: OnboardingService;
  let accountId: string;

  beforeEach(() => {
    g = new FakeGraph();
    for (const env of ['development', 'test', 'production']) g.addV('environment', env);
    g.addV('service', 'jenkins-apps');
    accountId = g.addV('brokerAccount', 'epsilon');
    const systemRepository = { getRegisteryJwtByClaimJti: async () => ({ accountId }) };
    const persistenceUtil = {
      getAccount: async (reg: any) => (reg ? { name: 'epsilon', vertex: accountId } : null),
    };
    service = new OnboardingService(
      g.graphService as any,
      g.graphRepository as any,
      g.collectionRepository as any,
      systemRepository as any,
      persistenceUtil as any,
    );
  });

  it('dry run by default: plans every object and connection, creates nothing', async () => {
    const plan = await service.onboard(tokenReq, manifest(), false);
    expect(plan.ok).toBe(true);
    expect(plan.apply).toBe(false);
    expect(g.created).toEqual([]);
    const creates = plan.steps.filter((s) => s.action === 'create');
    // project, service, repository, 3 instances
    expect(creates.filter((s) => s.kind === 'vertex')).toHaveLength(6);
    // component, 3x instance, 3x deploy-type, source, provision-token, authorized
    expect(creates.filter((s) => s.kind === 'edge')).toHaveLength(10);
  });

  it('apply creates the full setup, with Vault + AppRole enabled on the service', async () => {
    const plan = await service.onboard(tokenReq, manifest(), true);
    expect(plan.ok).toBe(true);
    expect(plan.steps.every((s) => s.action !== 'create')).toBe(true);
    const svc = g.vertices.find((v) => v.collection === 'service' && v.name === 'ata-war');
    expect(svc.data.vaultConfig).toEqual({ enabled: true, approle: { enabled: true } });
    const repo = g.vertices.find((v) => v.collection === 'repository');
    expect(repo.data).toMatchObject({ enableSyncSecrets: true, enableSyncUsers: true, type: 'git' });
    const project = g.vertices.find((v) => v.collection === 'project').id;
    expect(g.edges.some((e) => e.name === 'authorized' && e.source === accountId && e.target === project)).toBe(true);
  });

  it('is idempotent: a second apply reuses everything and creates nothing', async () => {
    await service.onboard(tokenReq, manifest(), true);
    g.created = [];
    const plan = await service.onboard(tokenReq, manifest(), true);
    expect(plan.ok).toBe(true);
    expect(g.created).toEqual([]);
    expect(plan.steps.every((s) => s.action === 'reuse')).toBe(true);
  });

  it('refuses a project that exists but belongs to another account', async () => {
    g.addV('project', 'ata');
    const plan = await service.onboard(tokenReq, manifest(), true);
    expect(plan.ok).toBe(false);
    expect(plan.steps.find((s) => s.type === 'project').action).toBe('conflict');
    expect(g.created).toEqual([]);
  });

  it('refuses a service that exists under another project', async () => {
    const other = g.addV('project', 'other');
    const svc = g.addV('service', 'ata-war');
    g.addE('component', other, svc);
    const plan = await service.onboard(tokenReq, manifest(), true);
    expect(plan.steps.find((s) => s.type === 'service' && s.name === 'ata-war').action).toBe('conflict');
    expect(g.created).toEqual([]);
  });

  it('refuses a repository name already registered to a different URL', async () => {
    g.addV('repository', 'nr-ata', { scmUrl: 'https://github.com/bcgov/nr-ata' });
    const plan = await service.onboard(tokenReq, manifest(), true);
    expect(plan.steps.find((s) => s.type === 'repository').action).toBe('conflict');
    expect(g.created).toEqual([]);
  });

  it("never reuses another service's instance with the same environment name", async () => {
    // ata-war already exists in our project (e.g. a re-run after a partial
    // apply), and another app has a 'development' instance.
    const project = g.addV('project', 'ata');
    g.addE('authorized', accountId, project);
    const ours = g.addV('service', 'ata-war');
    g.addE('component', project, ours);
    const otherSvc = g.addV('service', 'foo-war');
    const foreign = g.addV('serviceInstance', 'development');
    g.addE('instance', otherSvc, foreign);

    const plan = await service.onboard(tokenReq, manifest(), true);
    expect(plan.ok).toBe(true);
    expect(g.edges.some((e) => e.source === ours && e.target === foreign)).toBe(false);
    const devInstances = g.vertices.filter((v) => v.collection === 'serviceInstance' && v.name === 'development');
    expect(devInstances).toHaveLength(2);
  });

  it.each([
    ['service not prefixed by project', { service: { name: 'war' } }],
    ['upper-case project', { project: { name: 'ATA' }, service: { name: 'ATA-war' } }],
    ['scm owner not allowed', { repository: { name: 'nr-ata', scmUrl: 'https://github.com/someone/nr-ata' } }],
    ['repo name differs from URL', { repository: { name: 'nr-other', scmUrl: 'https://github.com/bcgov-c/nr-ata' } }],
    ['unknown environment', { environments: ['development', 'staging'] }],
    ['provision token not allowlisted', { provisionTokens: ['github-admin'] }],
    ['token naming another account', { account: 'someone-else' }],
  ])('rejects invalid input: %s', async (_label, over) => {
    const plan = await service.onboard(tokenReq, manifest(over as any), true);
    expect(plan.ok).toBe(false);
    expect(plan.steps.some((s) => s.action === 'invalid')).toBe(true);
    expect(g.created).toEqual([]);
  });

  it('admin sessions must name the account to authorize', async () => {
    const plan = await service.onboard(adminReq, manifest(), true);
    expect(plan.ok).toBe(false);
    expect(g.created).toEqual([]);
    const named = await service.onboard(adminReq, manifest({ account: 'epsilon' }), true);
    expect(named.ok).toBe(true);
  });
});
