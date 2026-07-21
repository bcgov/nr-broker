import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { lastValueFrom } from 'rxjs';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { MikroORM } from '@mikro-orm/core';
import { CreateRequestContext } from '@mikro-orm/decorators/legacy';
import {
  VAULT_KV_APPS_MOUNT,
  REDIS_QUEUES,
  CRON_JOB_KUBERNETES_SYNC_SECRETS,
} from '../constants';
import { AuditService } from '../audit/audit.service';
import { VaultService } from '../vault/vault.service';
import { RedisService } from '../redis/redis.service';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { BrokerAccountEntity } from '../persistence/entity/broker-account.entity';
import { CollectionNameEnum } from '../persistence/entity/collection-entity-union.type';
import { ServiceDto } from '../persistence/dto/service.dto';
import { ProjectDto } from '../persistence/dto/project.dto';
import { JobQueueUtil } from '../util/job-queue.util';

export interface KubernetesSecretMapping {
  sourceMount: string;
  sourcePath: string;
  destinationSecretName: string;
  keyMapping?: Record<string, string>;
}

export interface KubernetesSyncConfig {
  server: string;
  namespace: string;
  serviceAccountToken: string;
  caData?: string;
  secrets: KubernetesSecretMapping[];
}

@Injectable()
export class KubernetesSyncService {
  private readonly logger = new Logger(KubernetesSyncService.name);
  private readonly axiosInstance: AxiosInstance;

  constructor(
    private readonly auditService: AuditService,
    private readonly vaultService: VaultService,
    private readonly redisService: RedisService,
    private readonly graphRepository: GraphRepository,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly jobQueueUtil: JobQueueUtil,
    // used by: @CreateRequestContext()
    private readonly orm: MikroORM,
  ) {
    this.axiosInstance = axios.create();
  }

  public isEnabled(): boolean {
    return true;
  }

  /**
   * Queue all unique projects (from downstream services of an account) for Kubernetes secret sync.
   */
  public async refreshByAccount(account: BrokerAccountEntity): Promise<void> {
    const downstreamServices =
      await this.graphRepository.getDownstreamVertex<ServiceDto>(
        account.vertex.toString(),
        CollectionNameEnum.service,
        4,
      );

    if (downstreamServices) {
      const projectMap = new Map<string, ProjectDto>();

      for (const serviceUpDown of downstreamServices) {
        const service = serviceUpDown.collection;
        const projectDtoArr =
          await this.graphRepository.getUpstreamVertex<ProjectDto>(
            service.vertex.toString(),
            CollectionNameEnum.project,
            ['component'],
          );

        if (projectDtoArr.length === 1) {
          const project = projectDtoArr[0].collection;
          if (!projectMap.has(project.vertex.toString())) {
            projectMap.set(project.vertex.toString(), project);
          }
        }
      }

      for (const project of projectMap.values()) {
        await this.queueSync(project);
      }
    }
  }

  /**
   * Queue a service's project for Kubernetes secret sync.
   */
  public async refreshByService(service: ServiceDto): Promise<void> {
    const projectDtoArr =
      await this.graphRepository.getUpstreamVertex<ProjectDto>(
        service.vertex.toString(),
        CollectionNameEnum.project,
        ['component'],
      );

    if (projectDtoArr.length !== 1) {
      this.auditService.recordToolsSync(
        'info',
        'unknown',
        `Skip Kubernetes sync: could not resolve project for ${service.name}`,
        'Unknown',
        service.name,
      );
      return;
    }

    const project = projectDtoArr[0].collection;
    await this.queueSync(project);
  }

  /**
   * Queue a single project for Kubernetes sync.
   */
  private async queueSync(project: ProjectDto): Promise<void> {
    const jobData = JSON.stringify({
      projectVertexId: project.vertex.toString(),
    });

    this.redisService.queue(REDIS_QUEUES.KUBERNETES_SYNC_SECRETS, jobData);

    this.auditService.recordToolsSync(
      'info',
      'unknown',
      `Queued Kubernetes sync for ${project.name}`,
      project.name,
    );
  }

  /**
   * Cron job that polls the Redis queue for Kubernetes sync jobs.
   */
  @Cron(CronExpression.EVERY_30_SECONDS, {
    name: CRON_JOB_KUBERNETES_SYNC_SECRETS,
  })
  @CreateRequestContext()
  async pollKubernetesSyncCron(): Promise<void> {
    try {
      await this.jobQueueUtil.refreshJobWrap(
        this.schedulerRegistry,
        CRON_JOB_KUBERNETES_SYNC_SECRETS,
        REDIS_QUEUES.KUBERNETES_SYNC_SECRETS,
        () =>
          this.redisService.dequeue(
            REDIS_QUEUES.KUBERNETES_SYNC_SECRETS,
          ) as Promise<string | null>,
        async (jobData: string) => {
          const { projectVertexId } = JSON.parse(jobData);
          await this.runSync(projectVertexId);
        },
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to poll Kubernetes sync cron: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Process a single Kubernetes sync job.
   */
  private async runSync(projectVertexId: string): Promise<void> {
    // Resolve project via graph lookup
    const projectDtoArr = await this.graphRepository.getDownstreamVertex<ProjectDto>(
      projectVertexId,
      CollectionNameEnum.project,
      1,
    );

    if (!projectDtoArr || projectDtoArr.length === 0) {
      this.auditService.recordToolsSync(
        'info',
        'failure',
        `Kubernetes sync: project not found (${projectVertexId})`,
        'Unknown',
      );
      return;
    }

    const project = projectDtoArr[0].collection;
    await this.syncSecrets(project);
  }

  /**
   * Read Kubernetes sync configuration from Vault and apply secrets to the cluster.
   */
  public async syncSecrets(
    project: ProjectDto,
  ): Promise<void> {
    this.auditService.recordToolsSync(
      'start',
      'unknown',
      `Start Kubernetes secret sync: ${project.name}`,
      project.name,
    );

    // Read sync configuration from Vault
    const configPath = `tools/${project.name}/infrastructure/nr-broker-sync`;
    let config: KubernetesSyncConfig;

    try {
      const kvData = await lastValueFrom(
        this.vaultService.getKv(VAULT_KV_APPS_MOUNT, configPath),
      );
      config = this.parseConfig(kvData);
    } catch (error) {
      this.auditService.recordToolsSync(
        'end',
        'failure',
        `Kubernetes sync failed: no configuration at ${configPath}`,
        project.name,
      );
      return;
    }

    // Validate configuration
    if (!config.server || !config.namespace || !config.serviceAccountToken) {
      this.auditService.recordToolsSync(
        'end',
        'failure',
        'Kubernetes sync failed: missing server, namespace, or serviceAccountToken',
        project.name,
      );
      return;
    }

    if (!config.secrets || config.secrets.length === 0) {
      this.auditService.recordToolsSync(
        'end',
        'unknown',
        'Kubernetes sync: no secret mappings configured',
        project.name,
      );
      return;
    }

    // Process each secret mapping
    for (const secretMapping of config.secrets) {
      try {
        await this.applySecretMapping(config, secretMapping);
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `Failed to apply secret mapping ${secretMapping.destinationSecretName}: ${err.message}`,
        );
        this.auditService.recordToolsSync(
          'end',
          'failure',
          `Kubernetes sync failed for secret ${secretMapping.destinationSecretName}: ${err.message}`,
          project.name,
        );
        return;
      }
    }

    this.auditService.recordToolsSync(
      'end',
      'success',
      `End Kubernetes secret sync: ${project.name}`,
      project.name,
    );
  }

  /**
   * Parse raw Vault KV data into a structured configuration.
   */
  private parseConfig(kvData: Record<string, any>): KubernetesSyncConfig {
    return {
      server: kvData['server'] as string,
      namespace: kvData['namespace'] as string,
      serviceAccountToken: kvData['serviceAccountToken'] as string,
      caData: kvData['caData'] as string | undefined,
      secrets: (kvData['secrets'] as any[])?.map((s) => ({
        sourceMount: s.sourceMount as string,
        sourcePath: s.sourcePath as string,
        destinationSecretName: s.destinationSecretName as string,
        keyMapping: s.keyMapping as Record<string, string> | undefined,
      })),
    };
  }

  /**
   * Read secrets from the source Vault path and apply them to Kubernetes.
   */
  private async applySecretMapping(
    config: KubernetesSyncConfig,
    secretMapping: KubernetesSecretMapping,
  ): Promise<void> {
    // Read source secrets from Vault
    const sourceData = await lastValueFrom(
      this.vaultService.getKv(secretMapping.sourceMount, secretMapping.sourcePath),
    );

    // Build the secret data with key mapping applied
    const secretData: Record<string, string> = {};
    for (const [sourceKey, sourceValue] of Object.entries(sourceData)) {
      const destKey = secretMapping.keyMapping
        ? secretMapping.keyMapping[sourceKey] ?? sourceKey
        : sourceKey;
      secretData[destKey] = sourceValue.toString();
    }

    // Apply to Kubernetes
    await this.applySecretToKubernetes(
      config,
      secretMapping.destinationSecretName,
      secretData,
    );
  }

  /**
   * Create or update a Kubernetes Secret using the API.
   */
  private async applySecretToKubernetes(
    config: KubernetesSyncConfig,
    secretName: string,
    secretData: Record<string, string>,
  ): Promise<void> {
    const baseUrl = config.server.replace(/\/+$/, '');
    const url = `${baseUrl}/api/v1/namespaces/${config.namespace}/secrets/${secretName}`;

    // Base64 encode all values
    const encodedData: Record<string, string> = {};
    for (const [key, value] of Object.entries(secretData)) {
      encodedData[key] = Buffer.from(value).toString('base64');
    }

    const k8sSecret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: secretName,
        namespace: config.namespace,
      },
      type: 'Opaque',
      data: encodedData,
    };

    // Check if secret exists first
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.serviceAccountToken}`,
      'Content-Type': 'application/json',
    };

    try {
      // Try to GET the existing secret
      await this.axiosInstance.get(url, { headers });
      // Secret exists, PATCH it
      await this.axiosInstance.put(url, k8sSecret, { headers });
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        // Secret doesn't exist, CREATE it
        const createUrl = `${baseUrl}/api/v1/namespaces/${config.namespace}/secrets`;
        await this.axiosInstance.post(createUrl, k8sSecret, { headers });
      } else {
        throw error;
      }
    }
  }
}
