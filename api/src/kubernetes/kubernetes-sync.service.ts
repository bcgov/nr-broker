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
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { CollectionNameEnum } from '../persistence/entity/collection-entity-union.type';
import { CloudDto } from '../persistence/dto/cloud.dto';
import { OpenShiftProjectDto } from '../persistence/dto/openshift-project.dto';
import { OpenShiftProjectEntity } from '../persistence/entity/openshift-project.entity';
import { JobQueueUtil } from '../util/job-queue.util';
import { GraphService } from '../graph/graph.service';

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
    private readonly collectionRepository: CollectionRepository,
    private readonly graphService: GraphService,
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
   * Queue all OpenShift projects under the clouds operated by a team for Kubernetes secret sync.
   */
  public async refreshByTeam(teamVertexId: string): Promise<void> {
    const clouds = await this.graphRepository.getDownstreamVertex<CloudDto>(
      teamVertexId,
      CollectionNameEnum.cloud,
      8,
    );
    for (const cloudUpDown of clouds) {
      await this.refreshByCloud(cloudUpDown.collection.vertex.toString());
    }
  }

  /**
   * Queue all OpenShift projects under a cloud for Kubernetes secret sync.
   */
  public async refreshByCloud(cloudVertexId: string): Promise<void> {
    const openshiftProjects =
      await this.graphRepository.getDownstreamVertex<OpenShiftProjectDto>(
        cloudVertexId,
        CollectionNameEnum.openshiftProject,
        4,
      );
    for (const ospUpDown of openshiftProjects) {
      const osp = ospUpDown.collection;
      if (osp.enableSyncSecrets) {
        await this.queueSync(osp.id);
      }
    }
  }

  /**
   * Queue a single OpenShift project for Kubernetes sync.
   */
  private async queueSync(openshiftProjectId: string): Promise<void> {
    this.redisService.queue(
      REDIS_QUEUES.KUBERNETES_SYNC_SECRETS,
      openshiftProjectId,
    );

    this.auditService.recordToolsSync(
      'info',
      'unknown',
      `Queued Kubernetes sync for OpenShift project (${openshiftProjectId})`,
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
        async (openshiftProjectId: string) => {
          await this.runSync(openshiftProjectId);
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
  private async runSync(openshiftProjectId: string): Promise<void> {
    const openshiftProject = await this.collectionRepository.getCollectionById(
      'openshiftProject',
      openshiftProjectId,
    );

    if (!openshiftProject) {
      this.auditService.recordToolsSync(
        'info',
        'failure',
        `Kubernetes sync: OpenShift project not found (${openshiftProjectId})`,
      );
      return;
    }

    await this.syncSecrets(openshiftProject);
  }

  /**
   * Read Kubernetes sync configuration from Vault and apply secrets to the cluster.
   */
  public async syncSecrets(
    openshiftProject: OpenShiftProjectEntity,
  ): Promise<void> {
    this.auditService.recordToolsSync(
      'start',
      'unknown',
      `Start Kubernetes secret sync: ${openshiftProject.name}`,
      openshiftProject.name,
    );

    // Read sync configuration from Vault
    const configPath = `tools/openshift/${openshiftProject.name}/nr-broker-sync`;
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
        openshiftProject.name,
      );
      return;
    }

    // Validate configuration
    if (!config.server || !config.namespace || !config.serviceAccountToken) {
      this.auditService.recordToolsSync(
        'end',
        'failure',
        'Kubernetes sync failed: missing server, namespace, or serviceAccountToken',
        openshiftProject.name,
      );
      return;
    }

    if (!config.secrets || config.secrets.length === 0) {
      this.auditService.recordToolsSync(
        'end',
        'unknown',
        'Kubernetes sync: no secret mappings configured',
        openshiftProject.name,
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
          openshiftProject.name,
        );
        return;
      }
    }

    await this.graphService.updateSyncStatus(
      openshiftProject,
      'syncSecretsStatus',
      'syncAt',
    );

    this.auditService.recordToolsSync(
      'end',
      'success',
      `End Kubernetes secret sync: ${openshiftProject.name}`,
      openshiftProject.name,
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
