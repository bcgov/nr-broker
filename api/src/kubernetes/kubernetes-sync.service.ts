import * as https from 'https';
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { lastValueFrom } from 'rxjs';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { MikroORM } from '@mikro-orm/core';
import { CreateRequestContext } from '@mikro-orm/decorators/legacy';
import {
  REDIS_QUEUES,
  CRON_JOB_KUBERNETES_SYNC_SECRETS,
  VAULT_KV_APPS_MOUNT,
  VAULT_KV_CLOUDS_MOUNT,
} from '../constants';
import { AuditService } from '../audit/audit.service';
import { VaultService } from '../vault/vault.service';
import { RedisService } from '../redis/redis.service';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { OpenshiftProjectEntity } from '../persistence/entity/openshift-project.entity';
import { JobQueueUtil } from '../util/job-queue.util';
import { GraphService } from '../graph/graph.service';
import { CloudDto } from '../persistence/dto/cloud.dto';
import { ProjectDto } from '../persistence/dto/project.dto';
import { CollectionNameEnum } from '../persistence/dto/collection-dto-union.type';
import { OpenshiftProjectDto } from 'src/persistence/dto/openshift-project.dto';

export interface KubernetesSecretMapping {
  service: string;
  path?: string;
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

    const cloudDtoArr =
      await this.graphService.getUpstreamVertex<CloudDto>(
        openshiftProject.vertex.toString(),
        CollectionNameEnum.cloud,
        null,
      );

    if (!cloudDtoArr || cloudDtoArr.length === 0) {
      this.auditService.recordToolsSync(
        'info',
        'failure',
        `Kubernetes sync: Cloud not found for OpenShift project (${openshiftProjectId})`,
      );
      return;
    }

    await this.syncSecrets(cloudDtoArr[0].collection, openshiftProject);
  }

  /**
   * Read Kubernetes sync configuration from Vault and apply secrets to the cluster.
   */
  public async syncSecrets(
    cloud: CloudDto,
    openshiftProject: OpenshiftProjectEntity,
  ): Promise<void> {
    this.auditService.recordToolsSync(
      'start',
      'unknown',
      `Start Kubernetes secret sync: ${openshiftProject.name}`,
      openshiftProject.name,
    );

    // Read sync configuration from Vault
    const configPath = `${cloud.name}/${openshiftProject.name}/nr-broker-sync`;
    let config: KubernetesSyncConfig;

    try {
      const kvData = await lastValueFrom(
        this.vaultService.getKv(VAULT_KV_CLOUDS_MOUNT, configPath),
      );
      console.log('Kubernetes sync config from Vault:', kvData);
      config = this.parseConfig(cloud, openshiftProject, kvData);
    } catch (error) {
      console.log(error);
      this.auditService.recordToolsSync(
        'end',
        'failure',
        `Kubernetes sync failed: no configuration at ${configPath}`,
        openshiftProject.name,
      );
      return;
    }

    // Validate configuration
    if (!cloud.apiUrl || !config.namespace || !config.serviceAccountToken) {
      this.auditService.recordToolsSync(
        'end',
        'failure',
        'Kubernetes sync failed: missing consoleUrl, namespace, or serviceAccountToken',
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
      console.log(secretMapping);
      try {
        await this.applySecretMapping(config, cloud, openshiftProject, secretMapping);
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
  private parseConfig(
    cloud: CloudDto, openshiftProject: OpenshiftProjectEntity, kvData: Record<string, any>): KubernetesSyncConfig {
    return {
      server: cloud.apiUrl,
      namespace: openshiftProject.name,
      serviceAccountToken: kvData['serviceAccountToken'] as string,
      caData: kvData['caData'] as string | undefined,
      secrets: (JSON.parse(kvData['secrets']) as any[])?.map((s) => ({
        service: s.service as string,
        path: s.path as string | undefined,
        destinationSecretName: s.destinationSecretName as string,
        keyMapping: s.keyMapping as Record<string, string> | undefined,
      })),
    };
  }

  /**
   * Resolve the Vault mount and path for a secret mapping.
   *
   * The service is looked up by name and authorized via the `deploys` restricted
   * edge from the openshiftProject or its parent cloud. The Vault path is built
   * as `tools/<project>/<service>[/<path>]` on the apps mount.
   */
  private async resolveSecretSource(
    cloud: CloudDto,
    openshiftProject: OpenshiftProjectEntity,
    mapping: KubernetesSecretMapping,
  ): Promise<{ mount: string; path: string } | null> {
    const service = await this.collectionRepository.getCollectionByKeyValue(
      'service',
      'name',
      mapping.service,
    );
    if (!service) {
      this.logger.warn(`Kubernetes sync: service not found: ${mapping.service}`);
      return null;
    }

    const projectDtos = await this.graphService.getUpstreamVertex<ProjectDto>(
      service.vertex.toString(),
      CollectionNameEnum.project,
      ['component'],
    );
    if (projectDtos.length !== 1) {
      this.logger.warn(
        `Kubernetes sync: service ${mapping.service} does not belong to exactly one project`,
      );
      return null;
    }
    const project = projectDtos[0].collection;

    const [deployedCloud, deployedOpenshiftProject] = await Promise.all([
      this.graphService.getUpstreamVertex<CloudDto>(
        service.vertex.toString(),
        CollectionNameEnum.cloud,
        ['deploys'],
        true,
        1,
      ),
      this.graphService.getUpstreamVertex<OpenshiftProjectDto>(
        service.vertex.toString(),
        CollectionNameEnum.openshiftProject,
        ['deploys'],
        true,
        1,
      ),
    ]);

    // console.log(deployedCloud);
    // console.log(deployedOpenshiftProject);
    // console.log(cloud);
    // console.log(openshiftProject);

    const isAuthorized =
      deployedCloud.some(
        (dto) => dto.collection.vertex.toString() === cloud.vertex.toString(),
      ) ||
      deployedOpenshiftProject.some(
        (dto) => dto.collection.vertex.toString() === openshiftProject.vertex.toString(),
      );

    if (!isAuthorized) {
      this.logger.warn(
        `Kubernetes sync: service ${mapping.service} is not authorized for ${openshiftProject.name}`,
      );
      return null;
    }

    const basePath = `tools/${project.name}/${service.name}`;
    return {
      mount: VAULT_KV_APPS_MOUNT,
      path: mapping.path ? `${basePath}/${mapping.path}` : basePath,
    };
  }

  /**
   * Read secrets from the source Vault path and apply them to Kubernetes.
   */
  private async applySecretMapping(
    config: KubernetesSyncConfig,
    cloud: CloudDto,
    openshiftProject: OpenshiftProjectEntity,
    secretMapping: KubernetesSecretMapping,
  ): Promise<void> {
    const source = await this.resolveSecretSource(cloud, openshiftProject, secretMapping);
    if (!source) {
      throw new Error(
        `Could not resolve secret source for ${secretMapping.destinationSecretName}`,
      );
    }
    // Read source secrets from Vault
    const sourceData = await lastValueFrom(
      this.vaultService.getKv(source.mount, source.path),
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

    const httpsAgent = config.caData
      ? new https.Agent({ ca: Buffer.from(config.caData, 'base64').toString('utf-8') })
      : undefined;

    const requestConfig = { headers, ...(httpsAgent ? { httpsAgent } : {}) };

    try {
      // Try to GET the existing secret
      await this.axiosInstance.get(url, requestConfig);
      // Secret exists, PATCH it
      await this.axiosInstance.put(url, k8sSecret, requestConfig);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        // Secret doesn't exist, CREATE it
        const createUrl = `${baseUrl}/api/v1/namespaces/${config.namespace}/secrets`;
        await this.axiosInstance.post(createUrl, k8sSecret, requestConfig);
      } else {
        throw error;
      }
    }
  }
}
