import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance, isAxiosError } from 'axios';
import { Job } from 'bullmq';
import { posix } from 'node:path';
import { plainToInstance } from 'class-transformer';
import { shake } from 'radash';
import { parseAllDocuments } from 'yaml';
import {
  BULL_LEADER_JOBS,
  GITHUB_CATALOG_MAX_FILES,
  GITHUB_CATALOG_ORGS,
  GITHUB_CATALOG_SCAN_CRON,
  GITHUB_SYNC_CLIENT_ID,
  GITHUB_SYNC_PRIVATE_KEY,
  REDIS_QUEUES,
} from '../constants';
import { AuditService } from '../audit/audit.service';
import { BullService } from '../bull/bull.service';
import { GraphService } from '../graph/graph.service';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { VertexInsertDto } from '../persistence/dto/vertex.dto';
import { EdgeInsertDto } from '../persistence/dto/edge.dto';
import { VertexEntity } from '../persistence/entity/vertex.entity';
import { CollectionNames } from '../persistence/dto/collection-dto-union.type';
import { GithubSyncService } from './github-sync.service';

export const CATALOG_ROOT_FILE = 'catalog-info.yaml';

export interface CatalogOrgScanJob {
  type: 'org';
  org: string;
}

export interface CatalogRepoScanJob {
  type: 'repo';
  org: string;
  repo: string;
  defaultBranch: string;
  htmlUrl: string;
  description?: string;
}

export type CatalogScanJob = CatalogOrgScanJob | CatalogRepoScanJob;

export interface BackstageComponent {
  path: string;
  name: string;
  system?: string;
  title?: string;
  description?: string;
  lifecycle?: string;
  type?: string;
}

export interface ParsedCatalogFile {
  components: BackstageComponent[];
  locations: string[];
}

interface InstallationToken {
  token: string;
  expiresAt: number;
}

const TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000;

/**
 * Scans configured GitHub organizations for Backstage `catalog-info.yaml`
 * files and records the discovered projects, services and repositories in
 * the graph. `Location` entities are followed to find components in monorepos.
 */
@Injectable()
export class GithubCatalogService implements OnModuleInit {
  private readonly logger = new Logger(GithubCatalogService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly orgTokens = new Map<string, InstallationToken>();

  constructor(
    private readonly auditService: AuditService,
    private readonly bullService: BullService,
    private readonly collectionRepository: CollectionRepository,
    private readonly githubSyncService: GithubSyncService,
    private readonly graphService: GraphService,
    private readonly graphRepository: GraphRepository,
  ) {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  }

  public isEnabled(): boolean {
    return (
      GITHUB_CATALOG_ORGS.length > 0 &&
      GITHUB_SYNC_CLIENT_ID !== '' &&
      GITHUB_SYNC_PRIVATE_KEY !== ''
    );
  }

  onModuleInit(): void {
    if (!this.isEnabled()) {
      return;
    }
    this.bullService.registerWorker(
      REDIS_QUEUES.GITHUB_CATALOG_SCAN,
      async (job: Job) => {
        await this.processJob(job.data as CatalogScanJob);
      },
    );
    this.bullService.registerLeaderJob(
      BULL_LEADER_JOBS.GITHUB_CATALOG_SCAN,
      GITHUB_CATALOG_SCAN_CRON,
      () => this.enqueueOrgScans(),
    );
  }

  public async enqueueOrgScans(): Promise<void> {
    for (const org of GITHUB_CATALOG_ORGS) {
      await this.enqueue({ type: 'org', org }, `org-${org}`);
    }
  }

  public async processJob(data: CatalogScanJob): Promise<void> {
    if (data.type === 'org') {
      await this.scanOrg(data.org);
    } else if (data.type === 'repo') {
      await this.scanRepository(data);
    }
  }

  private async enqueue(data: CatalogScanJob, jobId: string) {
    // Removing finished jobs lets the stable job id dedupe only pending scans
    await this.bullService.enqueue(REDIS_QUEUES.GITHUB_CATALOG_SCAN, data, {
      jobId,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  private async scanOrg(org: string): Promise<void> {
    const token = await this.getOrgInstallationToken(org);
    let page = 1;
    let hasNextPage = true;
    let count = 0;

    while (hasNextPage) {
      const response = await this.axiosInstance.get('/installation/repositories', {
        params: { per_page: 100, page },
        headers: { Authorization: `token ${token}` },
      });
      for (const repo of response.data.repositories ?? []) {
        if (repo.archived || repo.disabled || repo.owner?.login !== org) {
          continue;
        }
        await this.enqueue(
          {
            type: 'repo',
            org,
            repo: repo.name,
            defaultBranch: repo.default_branch,
            htmlUrl: repo.html_url,
            description: repo.description ?? undefined,
          },
          `repo-${org}-${repo.name}`,
        );
        count++;
      }
      hasNextPage = response.headers.link?.includes('rel="next"') ?? false;
      page++;
    }

    this.auditService.recordToolsSync(
      'info',
      'success',
      `Catalog scan queued ${count} repositories for ${org}`,
    );
  }

  private async scanRepository(job: CatalogRepoScanJob): Promise<void> {
    const token = await this.getOrgInstallationToken(job.org);
    const components = await this.collectComponents(job, token);
    if (components.length === 0) {
      return;
    }

    this.auditService.recordToolsSync(
      'start',
      'unknown',
      `Start catalog sync: ${job.htmlUrl}`,
    );

    const repositoryVertex = await this.ensureRepository(job);
    let failures = 0;
    for (const component of components) {
      try {
        await this.syncComponent(component, repositoryVertex);
      } catch (error) {
        failures++;
        this.logger.warn(
          `Catalog sync failed for ${job.org}/${job.repo}:${component.path} (${component.name}): ${
            (error as Error).message
          }`,
        );
      }
    }

    this.auditService.recordToolsSync(
      'end',
      failures === 0 ? 'success' : 'failure',
      `End catalog sync: ${job.htmlUrl}`,
    );
  }

  /**
   * Read the root catalog file and follow `Location` targets within the same
   * repository. Visited paths and a file cap guard against cycles.
   */
  private async collectComponents(
    job: CatalogRepoScanJob,
    token: string,
  ): Promise<BackstageComponent[]> {
    const components: BackstageComponent[] = [];
    const visited = new Set<string>();
    const pending = [CATALOG_ROOT_FILE];

    while (pending.length > 0 && visited.size < GITHUB_CATALOG_MAX_FILES) {
      const path = pending.shift();
      if (visited.has(path)) {
        continue;
      }
      visited.add(path);

      const content = await this.fetchFile(job, path, token);
      if (content === null) {
        if (path !== CATALOG_ROOT_FILE) {
          this.logger.warn(
            `Catalog location target not found: ${job.org}/${job.repo}:${path}`,
          );
        }
        continue;
      }

      const parsed = this.parseCatalogFile(path, content);
      components.push(...parsed.components);
      pending.push(...parsed.locations);
    }

    return components;
  }

  public parseCatalogFile(path: string, content: string): ParsedCatalogFile {
    const result: ParsedCatalogFile = { components: [], locations: [] };

    for (const doc of parseAllDocuments(content)) {
      if (doc.errors.length > 0) {
        this.logger.warn(`Unable to parse catalog document in ${path}`);
        continue;
      }
      const entity = doc.toJS();
      if (!entity || typeof entity !== 'object') {
        continue;
      }

      if (entity.kind === 'Location') {
        const targets = [
          entity.spec?.target,
          ...(Array.isArray(entity.spec?.targets) ? entity.spec.targets : []),
        ];
        for (const target of targets) {
          const resolved = this.resolveLocationTarget(path, target);
          if (resolved) {
            result.locations.push(resolved);
          }
        }
      } else if (entity.kind === 'Component') {
        const name = entity.metadata?.name;
        if (typeof name !== 'string' || name === '') {
          this.logger.warn(`Catalog component in ${path} has no name`);
          continue;
        }
        result.components.push({
          path,
          name,
          system: this.asString(entity.spec?.system),
          title: this.asString(entity.metadata?.title),
          description: this.asString(entity.metadata?.description),
          lifecycle: this.asString(entity.spec?.lifecycle),
          type: this.asString(entity.spec?.type),
        });
      }
    }

    return result;
  }

  /**
   * Resolve a Location target relative to the file that declares it. Only
   * relative paths inside the repository are followed; URLs, absolute paths
   * and glob patterns are ignored.
   */
  public resolveLocationTarget(
    fromPath: string,
    target: unknown,
  ): string | null {
    if (typeof target !== 'string' || target === '') {
      return null;
    }
    if (
      target.includes('://') ||
      target.includes('*') ||
      posix.isAbsolute(target)
    ) {
      return null;
    }
    const resolved = posix.normalize(
      posix.join(posix.dirname(fromPath), target),
    );
    if (resolved === '..' || resolved.startsWith('../')) {
      return null;
    }
    return resolved;
  }

  private async syncComponent(
    component: BackstageComponent,
    repositoryVertex: VertexEntity,
  ): Promise<void> {
    if (!component.system) {
      this.logger.warn(
        `Catalog component ${component.name} (${component.path}) has no spec.system; skipping`,
      );
      return;
    }

    const projectVertex = await this.ensureVertex('project', component.system, {
      name: component.system,
    });
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
    );

    await this.ensureEdge('component', projectVertex, serviceVertex);
    await this.ensureEdge('source', serviceVertex, repositoryVertex);

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
    job: CatalogRepoScanJob,
  ): Promise<VertexEntity> {
    const existing = await this.collectionRepository.getCollectionByKeyValue(
      'repository',
      'scmUrl',
      job.htmlUrl,
    );
    if (existing) {
      return this.graphRepository.getVertex(existing.vertex.toString());
    }
    return this.ensureVertex('repository', job.repo, {
      name: job.repo,
      description: job.description ?? `${job.org}/${job.repo}`,
      type: 'git',
      scmUrl: job.htmlUrl,
      enableSyncSecrets: false,
      enableSyncUsers: false,
    });
  }

  private async ensureVertex(
    collection: CollectionNames,
    name: string,
    data: Record<string, unknown>,
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
    );
  }

  private async ensureEdge(
    name: string,
    source: VertexEntity,
    target: VertexEntity,
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
    );
  }

  private async fetchFile(
    job: CatalogRepoScanJob,
    path: string,
    token: string,
  ): Promise<string | null> {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    try {
      const response = await this.axiosInstance.get(
        `/repos/${job.org}/${job.repo}/contents/${encodedPath}`,
        {
          params: { ref: job.defaultBranch },
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.raw+json',
          },
          responseType: 'text',
          transformResponse: (body) => body,
        },
      );
      return typeof response.data === 'string' ? response.data : null;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  private async getOrgInstallationToken(org: string): Promise<string> {
    const cached = this.orgTokens.get(org);
    if (cached && cached.expiresAt - TOKEN_EXPIRY_MARGIN_MS > Date.now()) {
      return cached.token;
    }

    const appJwt = this.githubSyncService.generateJWT();
    const installation = await this.axiosInstance.get(
      `/orgs/${encodeURIComponent(org)}/installation`,
      { headers: { Authorization: `Bearer ${appJwt}` } },
    );
    const response = await this.axiosInstance.post(
      `/app/installations/${installation.data.id}/access_tokens`,
      {},
      { headers: { Authorization: `Bearer ${appJwt}` } },
    );
    const token: InstallationToken = {
      token: response.data.token,
      expiresAt: new Date(response.data.expires_at).getTime(),
    };
    this.orgTokens.set(org, token);
    return token.token;
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value !== '' ? value : undefined;
  }
}
