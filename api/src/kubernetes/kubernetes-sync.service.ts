import * as https from 'https';
import { HttpException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { CreateRequestContext } from '@mikro-orm/decorators/legacy';
import axios, { AxiosInstance, isAxiosError } from 'axios';
import { lastValueFrom } from 'rxjs';
import { Job } from 'bullmq';
import {
  REDIS_QUEUES,
  VAULT_KV_APPS_MOUNT,
  VAULT_KV_CLOUDS_MOUNT,
  KUBERNETES_SYNC_SECRET_LABEL_KEY,
  KUBERNETES_SYNC_SECRET_LABEL_VALUE,
} from '../constants';
import { AuditService } from '../audit/audit.service';
import { VaultService } from '../vault/vault.service';
import { TokenService } from '../token/token.service';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { OpenshiftProjectEntity } from '../persistence/entity/openshift-project.entity';
import { GraphService } from '../graph/graph.service';
import { CloudDto } from '../persistence/dto/cloud.dto';
import { ProjectDto } from '../persistence/dto/project.dto';
import { CollectionNameEnum } from '../persistence/dto/collection-dto-union.type';
import { OpenshiftProjectDto } from '../persistence/dto/openshift-project.dto';
import { BrokerTokenUtil } from '../util/broker-token.util';
import { BullService } from '../bull/bull.service';
import { SyncResult } from '../persistence/dto/sync-status.dto';
import { syncFailure, syncMessage, syncOutcome } from '../util/sync-result.util';

export interface KubernetesSecretMapping {
  service: string;
  path?: string;
  environment?: string;
  brokerTokenClientId?: string;
  destinationSecretName: string;
  keyMapping?: Record<string, string>;
}

export interface KubernetesSyncConfig {
  version?: string | number;
  server: string;
  namespace: string;
  serviceAccountToken: string;
  caData?: string;
  secrets: KubernetesSecretMapping[];
  /**
   * When true, sync fails if any source or mapped key cannot be made
   * DNS-1123 compliant (see `sanitizeSecretKey`). When false or omitted
   * (the default), non-compliant keys are automatically rewritten to a
   * DNS-1123 compliant form.
   */
  rejectNonCompliantKeys?: boolean;
}

@Injectable()
export class KubernetesSyncService implements OnModuleInit {
  private readonly logger = new Logger(KubernetesSyncService.name);
  private readonly axiosInstance: AxiosInstance;

  constructor(
    private readonly auditService: AuditService,
    private readonly vaultService: VaultService,
    private readonly tokenService: TokenService,
    private readonly brokerTokenUtil: BrokerTokenUtil,
    private readonly collectionRepository: CollectionRepository,
    private readonly graphService: GraphService,
    private readonly bullService: BullService,
    // used by: @CreateRequestContext()
    private readonly orm: MikroORM,
  ) {
    this.axiosInstance = axios.create();
  }

  public isEnabled(): boolean {
    return true;
  }

  onModuleInit(): void {
    this.bullService.registerWorker(
      REDIS_QUEUES.KUBERNETES_SYNC_SECRETS,
      async (job: Job) => {
        await this.runSync(job.data as string);
      },
    );
  }

  /**
   * Process a single Kubernetes sync job.
   */
  @CreateRequestContext()
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
      ).catch(async (error: unknown) => {
        const result = syncFailure(error);
        await this.graphService.updateSyncStatus(openshiftProject, 'syncSecretsStatus', 'syncAt', result);
        this.auditService.recordToolsSync(
          'end', 'failure', syncMessage('Kubernetes secret sync', openshiftProject.name, result),
          openshiftProject.name, undefined, result,
        );
        throw error;
      });

    if (!cloudDtoArr || cloudDtoArr.length === 0) {
      const result = syncFailure(`Cloud not found for OpenShift project ${openshiftProject.name}. Link a Cloud and retry.`);
      await this.graphService.updateSyncStatus(openshiftProject, 'syncSecretsStatus', 'syncAt', result);
      this.auditService.recordToolsSync(
        'end',
        'failure',
        syncMessage('Kubernetes secret sync', openshiftProject.name, result),
        openshiftProject.name, undefined, result,
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

    let result: SyncResult;
    try {
      result = await this.applySecrets(cloud, openshiftProject);
    } catch (error) {
      result = syncFailure(error);
    }
    await this.graphService.updateSyncStatus(
      openshiftProject, 'syncSecretsStatus', 'syncAt', result,
    );
    this.auditService.recordToolsSync(
      'end', syncOutcome(result), syncMessage('Kubernetes secret sync', openshiftProject.name, result),
      openshiftProject.name, undefined, result.errorMessage ? result : undefined,
    );
  }

  private async applySecrets(
    cloud: CloudDto,
    openshiftProject: OpenshiftProjectEntity,
  ): Promise<SyncResult> {
    const configPath = `${cloud.name}/${openshiftProject.name}/nr-broker-sync`;
    let config: KubernetesSyncConfig;

    try {
      const kvData = await lastValueFrom(
        this.vaultService.getKv(VAULT_KV_CLOUDS_MOUNT, configPath),
      );
      config = this.parseConfig(cloud, openshiftProject, kvData);
    } catch (error) {
      const result = syncFailure(error);
      return { ...result, errorMessage: `Could not read sync configuration at ${configPath}. ${result.errorMessage}` };
    }

    // Validate configuration
    if (!cloud.apiUrl || !config.namespace || !config.serviceAccountToken) {
      return syncFailure('Missing apiUrl, namespace, or serviceAccountToken. Update the Cloud and Vault sync configuration, then retry.');
    }

    if (!config.secrets || config.secrets.length === 0) {
      return { state: 'skipped', errorMessage: 'No secret mappings are configured. Add mappings in Vault and retry.' };
    }

    const failures: SyncResult[] = [];
    let completed = 0;
    for (const secretMapping of config.secrets) {
      try {
        const result = await this.applySecretMapping(config, cloud, openshiftProject, secretMapping);
        if (result.state !== 'success') {
          failures.push(result);
        }
        completed++;
      } catch (error) {
        const result = syncFailure(error, completed > 0);
        this.logger.error(
          `Failed to apply secret mapping ${secretMapping.destinationSecretName}: ${result.errorMessage}`,
        );
        return {
          ...result,
          errorCode: failures.find((failure) => failure.errorCode)?.errorCode ?? result.errorCode,
          errorMessage: [...failures.map((failure) => failure.errorMessage), `Secret ${secretMapping.destinationSecretName}: ${result.errorMessage}`].join('; '),
        };
      }
    }

    return failures.length > 0
      ? {
          state: 'partial',
          errorCode: failures.find((failure) => failure.errorCode)?.errorCode,
          errorMessage: failures.map((failure) => failure.errorMessage).join('; '),
        }
      : { state: 'success' };
  }

  /**
   * Parse raw Vault KV data into a structured configuration.
   */
  private parseConfig(
    cloud: CloudDto, openshiftProject: OpenshiftProjectEntity, kvData: Record<string, any>): KubernetesSyncConfig {
    return {
      version: kvData['version'] as string | undefined,
      server: cloud.apiUrl,
      namespace: openshiftProject.name,
      serviceAccountToken: kvData['serviceAccountToken'] as string,
      caData: kvData['caData'] as string | undefined,
      rejectNonCompliantKeys:
        kvData['rejectNonCompliantKeys'] === true ||
        kvData['rejectNonCompliantKeys'] === 'true',
      secrets: (JSON.parse(kvData['secrets']) as any[])?.map((s) => ({
        service: s.service as string,
        path: s.path as string | undefined,
        environment: s.environment as string | undefined,
        brokerTokenClientId: s.brokerTokenClientId as string | undefined,
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
  ): Promise<{ mount: string; path: string; projectName: string } | null> {
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
      this.graphService.getDownstreamVertex<CloudDto>(
        service.vertex.toString(),
        CollectionNameEnum.cloud,
        1,
        true,
      ),
      this.graphService.getDownstreamVertex<OpenshiftProjectDto>(
        service.vertex.toString(),
        CollectionNameEnum.openshiftProject,
        1,
        true,
      ),
    ]);

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
      projectName: project.name,
    };
  }

  /**
   * Rewrite a secret key so it is compliant with DNS-1123, the rule Kubernetes
   * enforces on Secret data keys. Uppercase letters are lowercased, disallowed
   * characters are replaced with `-`, leading and trailing hyphens are trimmed,
   * and the result is truncated to 63 characters.
   *
   * It is used both to sanitize keys (the default) and to detect non-compliance
   * by comparing `sanitizeSecretKey(key)` against the original key.
   */
  private sanitizeSecretKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
      .slice(0, 63);
  }

  /**
   * Read secrets from the source Vault path and apply them to Kubernetes.
   */
  private async applySecretMapping(
    config: KubernetesSyncConfig,
    cloud: CloudDto,
    openshiftProject: OpenshiftProjectEntity,
    secretMapping: KubernetesSecretMapping,
  ): Promise<SyncResult> {
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

    // Build the secret data with key mapping applied. Keys are normalized to be
    // DNS-1123 compliant by default so the Kubernetes API accepts them.
    const reject = config.rejectNonCompliantKeys ?? false;
    const skippedKeys: string[] = [];
    const secretData: Record<string, string> = {};
    for (const [sourceKey, sourceValue] of Object.entries(sourceData)) {
      let destKey = secretMapping.keyMapping
        ? secretMapping.keyMapping[sourceKey] ?? sourceKey
        : sourceKey;

      if (reject) {
        // Detect non-compliant keys and fail instead of rewriting them.
        const compliant = this.sanitizeSecretKey(destKey);
        if (compliant !== destKey) {
          throw new Error(
            `Kubernetes sync: key "${destKey}" is not DNS-1123 compliant and ` +
            `rejectNonCompliantKeys is set for secret ${secretMapping.destinationSecretName}`,
          );
        }
      } else {
        destKey = this.sanitizeSecretKey(destKey);
        if (!destKey) {
          // Key collapsed to an empty string; skip it rather than emit an empty key.
          const message =
            `Kubernetes sync: key "${sourceKey}" for secret ` +
            `${secretMapping.destinationSecretName} is empty after DNS-1123 sanitization; skipping`;
          this.auditService.recordToolsSync(
            'info',
            'unknown',
            message,
            openshiftProject.name,
          );
          skippedKeys.push(sourceKey);
          continue;
        }
      }

      secretData[destKey] = sourceValue.toString();
    }

    if (secretMapping.environment) {
      const roleInfo = await lastValueFrom(
        this.tokenService.getAppRoleInfoForApplication(
          source.projectName,
          secretMapping.service,
          secretMapping.environment,
        ),
      );
      secretData.role_id = roleInfo.id;
    }

    if (secretMapping.brokerTokenClientId) {
      const tokenKey = this.brokerTokenUtil.getVaultKey(
        secretMapping.brokerTokenClientId,
      );
      const brokerToken = sourceData[tokenKey];
      if (brokerToken === undefined || brokerToken === null) {
        throw new Error(
          `Broker token ${secretMapping.brokerTokenClientId} not found in source secret`,
        );
      }
      secretData.token = brokerToken.toString();
    }

    // Apply to Kubernetes
    await this.applySecretToKubernetes(
      config,
      secretMapping.destinationSecretName,
      secretData,
    );
    return skippedKeys.length > 0
      ? {
          state: 'partial',
          errorCode: 'SECRET_KEYS_SKIPPED',
          errorMessage: `Secret ${secretMapping.destinationSecretName} skipped keys that are empty after normalization: ${skippedKeys.join(', ')}. Rename the source keys and retry.`,
        }
      : { state: 'success' };
  }

  /**
   * Create or update a Kubernetes Secret using the API.
   *
   * The secret is labeled so it can be identified as managed by NR Broker.
   * When the secret already exists it is replaced in full (PUT) with the
   * freshly computed data - this is the desired behaviour so the managed
   * secret always reflects the current source. On 404 the secret is created.
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
        labels: {
          [KUBERNETES_SYNC_SECRET_LABEL_KEY]: KUBERNETES_SYNC_SECRET_LABEL_VALUE,
        },
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
      try {
        await this.axiosInstance.get(url, requestConfig);
        await this.axiosInstance.put(url, k8sSecret, requestConfig);
      } catch (error) {
        if (!isAxiosError(error) || error.response?.status !== 404) throw error;
        const createUrl = `${baseUrl}/api/v1/namespaces/${config.namespace}/secrets`;
        await this.axiosInstance.post(createUrl, k8sSecret, requestConfig);
      }
    } catch (error) {
      if (isAxiosError<{ message?: string; reason?: string }>(error) && error.response) {
        const data = error.response.data;
        throw new HttpException(data?.message || data?.reason || error.message, error.response.status, {
          cause: error,
        });
      }
      throw error;
    }
  }
}
