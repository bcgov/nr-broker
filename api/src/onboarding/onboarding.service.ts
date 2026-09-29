import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Request } from 'express';
import { GraphService } from '../graph/graph.service';
import { EdgeInsertDto } from '../persistence/dto/edge.dto';
import { VertexInsertDto } from '../persistence/dto/vertex.dto';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { PersistenceUtilService } from '../persistence/persistence-util.service';
import { OnboardingManifestDto } from './dto/onboarding-manifest.dto';
import { OnboardingPlanDto, OnboardingStepDto } from './dto/onboarding-plan.dto';

/** Lower case, starts with a letter (OSCAR naming guidance). */
const NAME_RE = /^[a-z][a-z0-9-]*[a-z0-9]$/;
const REPO_NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;
const DEFAULT_SCM_OWNERS = 'bcgov,bcgov-c,bcgov-nr';
const DEFAULT_PROVISION_TOKENS = 'jenkins-apps';

interface Caller {
  admin: boolean;
  accountName: string;
  accountVertexId: string | null;
}

interface Ref {
  id: string | null;
  label: string;
}

/**
 * Scoped, create-only onboarding of a new application into the Broker graph.
 *
 * A dry run (the default) returns the full plan and changes nothing. Applying
 * is refused while any step is a conflict or invalid. Existing objects are
 * reused only when they already belong to the caller's project, so an
 * onboarding call can never attach itself to another team's objects. Nothing
 * is edited or deleted.
 */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly graphService: GraphService,
    private readonly graphRepository: GraphRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly systemRepository: SystemRepository,
    private readonly persistenceUtil: PersistenceUtilService,
  ) {}

  public async onboard(
    req: Request,
    manifest: OnboardingManifestDto,
    apply: boolean,
  ): Promise<OnboardingPlanDto> {
    const steps: OnboardingStepDto[] = [];
    const caller = await this.resolveCaller(req, manifest, steps);
    this.validateNames(manifest, steps);

    // Pre-existing objects this call connects to; never created here.
    const envRefs: Record<string, Ref> = {};
    for (const env of manifest.environments) {
      envRefs[env] = await this.requireExisting('environment', env, steps);
    }
    const tokenRefs: Ref[] = [];
    for (const token of this.provisionTokens(manifest, steps)) {
      tokenRefs.push(await this.requireExisting('service', token, steps));
    }

    const project = await this.planProject(manifest, caller, steps);
    const service = await this.planService(manifest, project, steps);
    const repository = manifest.repository
      ? await this.planRepository(manifest, steps)
      : null;
    const instances: Record<string, Ref> = {};
    for (const env of manifest.environments) {
      instances[env] = await this.planInstance(service, env, steps);
    }

    const account: Ref = {
      id: caller.accountVertexId,
      label: `brokerAccount:${caller.accountName}`,
    };
    const edges: [string, Ref, Ref][] = [
      ['component', project, service],
      ...manifest.environments.flatMap(
        (env): [string, Ref, Ref][] => [
          ['instance', service, instances[env]],
          ['deploy-type', instances[env], envRefs[env]],
        ],
      ),
      ...(repository ? [['source', service, repository] as [string, Ref, Ref]] : []),
      ...tokenRefs.map((t): [string, Ref, Ref] => ['provision-token', service, t]),
      ['authorized', account, project],
    ];
    for (const [name, source, target] of edges) {
      await this.planEdge(name, source, target, steps);
    }

    const ok = !steps.some((s) => s.action === 'conflict' || s.action === 'invalid');
    if (!apply || !ok) {
      return { apply, ok, steps };
    }
    await this.applyPlan(req, manifest, steps, {
      project, service, repository, instances, edges,
    });
    return { apply, ok: true, steps };
  }

  // --- caller -----------------------------------------------------------

  private async resolveCaller(
    req: Request,
    manifest: OnboardingManifestDto,
    steps: OnboardingStepDto[],
  ): Promise<Caller> {
    if (req.headers.authorization) {
      const jti = (req.user as any)?.jti;
      const registryJwt = jti
        ? await this.systemRepository.getRegisteryJwtByClaimJti(jti)
        : null;
      const account = await this.persistenceUtil.getAccount(registryJwt);
      if (!account) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Bad request',
          error: 'Token is not bound to a broker account',
        });
      }
      if (manifest.account && manifest.account !== account.name) {
        steps.push(this.step('vertex', 'brokerAccount', manifest.account, 'invalid',
          `a token for account '${account.name}' cannot onboard for another account`));
      }
      return { admin: false, accountName: account.name, accountVertexId: account.vertex.toString() };
    }
    // Admin session (the guard has already required the admin role).
    if (!manifest.account) {
      steps.push(this.step('vertex', 'brokerAccount', '(none)', 'invalid',
        'admin sessions must name the broker account to authorize'));
      return { admin: true, accountName: '(none)', accountVertexId: null };
    }
    const account = await this.graphRepository.getVertexByName('brokerAccount', manifest.account);
    if (!account) {
      steps.push(this.step('vertex', 'brokerAccount', manifest.account, 'invalid', 'broker account not found'));
    }
    return { admin: true, accountName: manifest.account, accountVertexId: account ? String(account.id) : null };
  }

  // --- validation -------------------------------------------------------

  private validateNames(manifest: OnboardingManifestDto, steps: OnboardingStepDto[]) {
    const project = manifest.project.name;
    const service = manifest.service.name;
    if (!NAME_RE.test(project)) {
      steps.push(this.step('vertex', 'project', project, 'invalid',
        'must be lower case letters, digits and hyphens, starting with a letter'));
    }
    if (!NAME_RE.test(service) || !service.startsWith(`${project}-`)) {
      steps.push(this.step('vertex', 'service', service, 'invalid',
        `must be lower case and start with the project name ('${project}-')`));
    }
    if (manifest.repository) {
      const { name, scmUrl } = manifest.repository;
      if (!REPO_NAME_RE.test(name)) {
        steps.push(this.step('vertex', 'repository', name, 'invalid', 'invalid repository name'));
      }
      const owners = (process.env.BROKER_ONBOARDING_SCM_OWNERS ?? DEFAULT_SCM_OWNERS)
        .split(',').map((o) => o.trim()).filter(Boolean);
      const match = /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/.exec(scmUrl);
      if (!match || !owners.includes(match[1])) {
        steps.push(this.step('vertex', 'repository', name, 'invalid',
          `scmUrl must be https://github.com/<${owners.join('|')}>/<repo>`));
      } else if (match[2].toLowerCase() !== name.toLowerCase()) {
        steps.push(this.step('vertex', 'repository', name, 'invalid',
          `repository name must match the scmUrl repo ('${match[2]}')`));
      }
    }
  }

  private provisionTokens(manifest: OnboardingManifestDto, steps: OnboardingStepDto[]): string[] {
    const allowed = (process.env.BROKER_ONBOARDING_PROVISION_TOKENS ?? DEFAULT_PROVISION_TOKENS)
      .split(',').map((t) => t.trim()).filter(Boolean);
    const requested = manifest.provisionTokens ?? allowed.slice(0, 1);
    return requested.filter((token) => {
      if (allowed.includes(token)) return true;
      steps.push(this.step('vertex', 'service', token, 'invalid',
        `provision token is not on the onboarding allowlist (${allowed.join(', ')})`));
      return false;
    });
  }

  private async requireExisting(collection: string, name: string, steps: OnboardingStepDto[]): Promise<Ref> {
    const vertex = await this.graphRepository.getVertexByName(collection as any, name);
    if (!vertex) {
      steps.push(this.step('vertex', collection, name, 'invalid', `${collection} '${name}' does not exist`));
      return { id: null, label: `${collection}:${name}` };
    }
    return { id: String(vertex.id), label: `${collection}:${name}` };
  }

  // --- plan -------------------------------------------------------------

  private async planProject(manifest: OnboardingManifestDto, caller: Caller, steps: OnboardingStepDto[]): Promise<Ref> {
    const name = manifest.project.name;
    const label = `project:${name}`;
    const existing = await this.graphRepository.getVertexByName('project', name);
    if (!existing) {
      steps.push(this.step('vertex', 'project', name, 'create'));
      return { id: null, label };
    }
    const id = String(existing.id);
    const authorized = caller.accountVertexId
      ? await this.graphRepository.getEdgeByNameAndVertices('authorized', caller.accountVertexId, id)
      : null;
    if (authorized) {
      steps.push(this.step('vertex', 'project', name, 'reuse', 'already authorized for this account', id));
      return { id, label };
    }
    steps.push(this.step('vertex', 'project', name, 'conflict',
      `project exists and is not authorized for account '${caller.accountName}'`, id));
    return { id, label };
  }

  private async planService(manifest: OnboardingManifestDto, project: Ref, steps: OnboardingStepDto[]): Promise<Ref> {
    const name = manifest.service.name;
    const label = `service:${name}`;
    const existing = await this.graphRepository.getVertexByName('service', name);
    if (!existing) {
      steps.push(this.step('vertex', 'service', name, 'create'));
      return { id: null, label };
    }
    const id = String(existing.id);
    const inProject = project.id
      ? await this.graphRepository.getEdgeByNameAndVertices('component', project.id, id)
      : null;
    if (inProject) {
      steps.push(this.step('vertex', 'service', name, 'reuse', `already a component of ${project.label}`, id));
    } else {
      steps.push(this.step('vertex', 'service', name, 'conflict',
        `service exists but is not a component of ${project.label}`, id));
    }
    return { id, label };
  }

  private async planRepository(manifest: OnboardingManifestDto, steps: OnboardingStepDto[]): Promise<Ref> {
    const { name, scmUrl } = manifest.repository;
    const label = `repository:${name}`;
    const existing = await this.collectionRepository.getCollectionByKeyValue('repository', 'name', name);
    if (!existing) {
      steps.push(this.step('vertex', 'repository', name, 'create'));
      return { id: null, label };
    }
    const id = existing.vertex.toString();
    if ((existing as any).scmUrl === scmUrl) {
      steps.push(this.step('vertex', 'repository', name, 'reuse', 'same scmUrl', id));
    } else {
      steps.push(this.step('vertex', 'repository', name, 'conflict',
        `repository exists with a different scmUrl (${(existing as any).scmUrl ?? 'none'})`, id));
    }
    return { id, label };
  }

  /** Instances share names across services, so they are matched by parent only. */
  private async planInstance(service: Ref, env: string, steps: OnboardingStepDto[]): Promise<Ref> {
    const label = `serviceInstance:${env}@${service.label}`;
    const existing = service.id
      ? await this.graphRepository.getVertexByParentIdAndName('serviceInstance', service.id, env)
      : null;
    if (existing) {
      steps.push(this.step('vertex', 'serviceInstance', label, 'reuse', undefined, String(existing.id)));
      return { id: String(existing.id), label };
    }
    steps.push(this.step('vertex', 'serviceInstance', label, 'create'));
    return { id: null, label };
  }

  private async planEdge(name: string, source: Ref, target: Ref, steps: OnboardingStepDto[]) {
    const label = `${source.label} -> ${target.label}`;
    if (source.id && target.id) {
      const edge = await this.graphRepository.getEdgeByNameAndVertices(name, source.id, target.id);
      if (edge) {
        steps.push(this.step('edge', name, label, 'reuse', undefined, String(edge.id)));
        return;
      }
    }
    steps.push(this.step('edge', name, label, 'create'));
  }

  // --- apply ------------------------------------------------------------

  /**
   * Creates what the plan marked `create`, in dependency order, filling in ids
   * as vertices are created. Each edge is re-checked just before it is added,
   * so a concurrent or repeated call cannot duplicate it. Broker has no
   * multi-document transactions: a failure part-way leaves what was created,
   * and a re-run reuses it.
   */
  private async applyPlan(
    req: Request,
    manifest: OnboardingManifestDto,
    steps: OnboardingStepDto[],
    plan: {
      project: Ref;
      service: Ref;
      repository: Ref | null;
      instances: Record<string, Ref>;
      edges: [string, Ref, Ref][];
    },
  ) {
    const create = async (ref: Ref, collection: string, data: object) => {
      if (ref.id) return;
      const vertex = await this.graphService.addVertex(
        req,
        plainToInstance(VertexInsertDto, { collection, data }),
        true,
      );
      ref.id = String(vertex.id);
      this.markCreated(steps, 'vertex', collection, ref);
    };

    await create(plan.project, 'project', {
      name: manifest.project.name,
      title: manifest.project.title,
      description: manifest.project.description,
    });
    await create(plan.service, 'service', {
      name: manifest.service.name,
      title: manifest.service.title,
      description: manifest.service.description,
      vaultConfig: { enabled: true, approle: { enabled: true } },
    });
    if (plan.repository && manifest.repository) {
      await create(plan.repository, 'repository', {
        name: manifest.repository.name,
        type: 'git',
        scmUrl: manifest.repository.scmUrl,
        enableSyncSecrets: manifest.repository.enableSyncSecrets ?? true,
        enableSyncUsers: manifest.repository.enableSyncUsers ?? true,
      });
    }
    for (const env of manifest.environments) {
      await create(plan.instances[env], 'serviceInstance', { name: env });
    }

    for (const [name, source, target] of plan.edges) {
      const existing = await this.graphRepository.getEdgeByNameAndVertices(
        name,
        source.id,
        target.id,
      );
      if (existing) continue;
      const edge = await this.graphService.addEdge(
        req,
        plainToInstance(EdgeInsertDto, { name, source: source.id, target: target.id }),
      );
      const label = `${source.label} -> ${target.label}`;
      const match = steps.find(
        (x) => x.kind === 'edge' && x.type === name && x.name === label && x.action === 'create',
      );
      if (match) {
        match.action = 'created';
        match.id = String(edge.id);
      }
    }
  }

  // --- helpers ----------------------------------------------------------

  private markCreated(steps: OnboardingStepDto[], kind: 'vertex', collection: string, ref: Ref) {
    const name = collection === 'serviceInstance' ? ref.label : ref.label.slice(collection.length + 1);
    const match = steps.find(
      (x) => x.kind === kind && x.type === collection && x.name === name && x.action === 'create',
    );
    if (match) {
      match.action = 'created';
      match.id = ref.id ?? undefined;
    }
  }

  private step(kind: 'vertex' | 'edge', type: string, name: string, action: OnboardingStepDto['action'], detail?: string, id?: string): OnboardingStepDto {
    return { kind, type, name, action, ...(detail ? { detail } : {}), ...(id ? { id } : {}) };
  }
}
