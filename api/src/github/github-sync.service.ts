import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import sodium from 'libsodium-wrappers';
import { Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/core';
import { CreateRequestContext } from '@mikro-orm/decorators/legacy';

import {
  GITHUB_MANAGED_URL_REGEX,
  VAULT_KV_APPS_MOUNT,
  REDIS_QUEUES,
  FEATURE_FLAG_GITHUB_ENVIRONMENT_SYNC,
  USER_ALIAS_DOMAIN_GITHUB,
} from '../constants';
import { ENVIRONMENT_NAMES } from '../intention/dto/constants.dto';
import { AuditService } from '../audit/audit.service';
import { VaultService } from '../vault/vault.service';
import { CollectionIndex } from '../graph/graph.constants';
import { ProjectDto } from '../persistence/dto/project.dto';
import { ServiceDto } from '../persistence/dto/service.dto';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { UserDto } from '../persistence/dto/user.dto';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { CollectionNameEnum } from '../persistence/entity/collection-entity-union.type';
import { RepositoryEntity } from '../persistence/entity/repository.entity';
import { GraphService } from '../graph/graph.service';
import { BullService } from '../bull/bull.service';
import { GithubService } from './github.service';
import { GithubTokenService } from './github-token.service';
import { SyncResult } from '../persistence/dto/sync-status.dto';
import { syncFailure, syncMessage, syncOutcome } from '../util/sync-result.util';

@Injectable()
export class GithubSyncService implements OnModuleInit {
  private readonly logger = new Logger(GithubSyncService.name);
  private brokerManagedRegex = new RegExp(GITHUB_MANAGED_URL_REGEX);

  constructor(
    private readonly auditService: AuditService,
    private readonly vaultService: VaultService,
    private readonly graphService: GraphService,
    private readonly graphRepository: GraphRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly bullService: BullService,
    private readonly githubService: GithubService,
    private readonly githubTokenService: GithubTokenService,
    // used by: @CreateRequestContext()
    private readonly orm: MikroORM,
  ) {}

  public isBrokerManagedScmUrl(scmUrl: string) {
    if (!scmUrl) {
      return false;
    }
    return this.brokerManagedRegex.test(scmUrl);
  }

  /**
   * Register BullMQ workers for the GitHub sync queues. Each worker is
   * gated by `QUEUE_PROCESSING` via {@link BullService}, so a dedicated
   * worker consumes only its assigned queue. The job payload is the
   * repository id.
   */
  onModuleInit(): void {
    this.bullService.registerWorker(
      REDIS_QUEUES.GITHUB_SYNC_SECRETS,
      async (job: Job) => {
        await this.runRefresh(job.data as string, true, false);
      },
    );
    this.bullService.registerWorker(
      REDIS_QUEUES.GITHUB_SYNC_USERS,
      async (job: Job) => {
        await this.runRefresh(job.data as string, false, true);
      },
    );
  }

  @CreateRequestContext()
  async runRefresh(
    repositoryId: string,
    syncSecrets: boolean,
    syncUsers: boolean,
  ): Promise<void> {
    const repository = await this.collectionRepository.getCollectionById(
      'repository',
      repositoryId,
    );
    if (!repository) {
      const error = new Error(`Repository ${repositoryId} was not found. Check the repository ID and retry.`);
      this.auditService.recordGraphSync('end', 'failure', error.message, undefined, undefined, error);
      throw error;
    }

    if (!this.isBrokerManagedScmUrl(repository.scmUrl)) {
      this.auditService.recordGraphSync(
        'info',
        'unknown',
        `Skip sync of unmanaged url (${repository.id})`,
      );
      const result: SyncResult = { state: 'skipped', errorMessage: 'The repository URL is not managed by Broker.' };
      if (syncSecrets) {
        await this.graphService.updateSyncStatus(repository, 'syncSecretsStatus', 'syncAt', result);
      }
      if (syncUsers) {
        await this.graphService.updateSyncStatus(repository, 'syncUsersStatus', 'syncAt', result);
      }
      return;
    }

    this.auditService.recordGraphSync(
      'info',
      'unknown',
      `Sync repository (${repository.id})`,
    );

    if (syncUsers && repository.enableSyncUsers) {
      await this.syncUsers(repository);
    } else if (syncUsers) {
      await this.graphService.updateSyncStatus(repository, 'syncUsersStatus', 'syncAt', {
        state: 'skipped', errorMessage: 'User sync is disabled. Enable user sync and retry.',
      });
    }

    if (syncSecrets && repository.enableSyncSecrets) {
      await this.syncRepositorySecrets(repository);
    } else if (syncSecrets) {
      await this.graphService.updateSyncStatus(repository, 'syncSecretsStatus', 'syncAt', {
        state: 'skipped', errorMessage: 'Secret sync is disabled. Enable secret sync and retry.',
      });
    }
  }

  private async syncRepositorySecrets(repository: RepositoryEntity): Promise<void> {
    this.auditService.recordToolsSync(
      'start', 'unknown', `Start repository secret sync: ${repository.scmUrl}`,
    );
    const results: SyncResult[] = [];
    let fatalFailure: { error: unknown } | undefined;
    try {
      const serviceDtoArr =
        await this.graphRepository.getUpstreamVertex<ServiceDto>(
          repository.vertex.toString(),
          CollectionNameEnum.service,
          ['source'],
        );

      for (const serviceUpDown of serviceDtoArr) {
        const service = serviceUpDown.collection;
        const projectDtoArr =
          await this.graphRepository.getUpstreamVertex<ProjectDto>(
            service.vertex.toString(),
            CollectionNameEnum.project,
            ['component'],
          );
        if (projectDtoArr.length !== 1) {
          results.push(syncFailure(`Service ${service.name} must belong to exactly one project. Fix the project link and retry.`));
          this.auditService.recordToolsSync(
            'info',
            'failure',
            `Skip sync: ${service.name}`,
            'Unknown',
            service.name,
          );
          continue;
        }
        const project = projectDtoArr[0].collection;

        results.push(await this.syncSecrets(project, service, repository, false));
      }
    } catch (error) {
      results.push(syncFailure(error));
      fatalFailure = { error };
    }
    const failures = results.filter((result) => result.state !== 'success');
    const result: SyncResult = results.length === 0
      ? { state: 'skipped', errorMessage: 'No services are linked to the repository. Add a source link and retry.' }
      : failures.length > 0
        ? {
            state: results.some((item) => item.state === 'success' || item.state === 'partial') ? 'partial' : 'failure',
            errorCode: failures.find((item) => item.errorCode)?.errorCode,
            errorMessage: failures.map((item) => item.errorMessage).join('; '),
          }
        : { state: 'success' };
    await this.graphService.updateSyncStatus(repository, 'syncSecretsStatus', 'syncAt', result);
    this.auditService.recordToolsSync(
      'end', syncOutcome(result), syncMessage('Repository secret sync', repository.scmUrl, result),
      undefined, undefined, result.errorMessage ? result : undefined,
    );
    if (fatalFailure) {
      throw fatalFailure.error;
    }
  }

  public async syncSecrets(
    project: ProjectDto,
    service: ServiceDto,
    repository: RepositoryEntity,
    persistStatus = true,
  ): Promise<SyncResult> {
    if (!this.isBrokerManagedScmUrl(repository.scmUrl)) {
      throw new Error('Service does not have Github repo URL to update');
    }
    if (!repository.enableSyncSecrets) {
      throw new Error('Service does not have sync enabled');
    }
    this.auditService.recordToolsSync(
      'start',
      'unknown',
      `Start secret sync: ${repository.scmUrl}`,
      project.name,
      service.name,
    );
    const path = `tools/${project.name}/${service.name}`;
    let result: SyncResult = { state: 'success' };
    let completed = 0;
    try {
      const kvData = await lastValueFrom(
        this.vaultService.getKv(VAULT_KV_APPS_MOUNT, path),
      );
      if (kvData) {
        for (const [secretName, secretValue] of Object.entries(kvData)) {
          await this.updateSecret(
            repository.scmUrl,
            secretName,
            secretValue.toString(),
          );
          completed++;
        }
      }
    } catch (error) {
      result = syncFailure(error, completed > 0);
    }

    if (persistStatus) {
      await this.graphService.updateSyncStatus(
        repository,
        'syncSecretsStatus',
        'syncAt',
        result,
      );
    }

    this.auditService.recordToolsSync(
      'end',
      syncOutcome(result),
      syncMessage('Secret sync', repository.scmUrl, result),
      project.name,
      service.name,
      result.errorMessage ? result : undefined,
    );
    return result;
  }

  private async updateSecret(
    scmUrl: string,
    secretName: string,
    secretValue: string,
  ): Promise<void> {
    const { owner, repo } = this.getOwnerAndRepoFromUrl(scmUrl);
    const token = await this.githubTokenService.getRepoInstallationAccessToken(
      owner,
      repo,
    );
    const filteredSecretName = secretName.replace(/[^a-zA-Z0-9_]/g, '_');

    if (!token) {
      throw new Error('GitHub access token is null!');
    }
    const { key: base64PublicKey, key_id: keyId } = await this.githubService.getPublicKey(
      owner,
      repo,
      token,
    );
    // Encrypt secret
    const encryptedSecret = await this.encryptSecret(
      base64PublicKey.toString('utf-8'),
      secretValue,
    );
    // Update secret
    await this.githubService.putRepoActionsSecret(
      owner,
      repo,
      filteredSecretName,
      { encrypted_value: encryptedSecret, key_id: keyId },
      token,
    );
  }

  public async syncUsers(repository: RepositoryEntity) {
    if (!this.isBrokerManagedScmUrl(repository.scmUrl)) {
      throw new Error('Service does not have GitHub repo URL to update');
    }
    if (!repository.enableSyncUsers) {
      throw new Error('Service does not have user sync enabled');
    }

    let result: SyncResult = { state: 'success' };
    const failures: SyncResult[] = [];
    let completed = 0;
    try {
      this.auditService.recordGraphSync(
        'start',
        'unknown',
        `Start user sync: ${repository.scmUrl}`,
      );

      const { owner, repo } = this.getOwnerAndRepoFromUrl(repository.scmUrl);
      const token =
        await this.githubTokenService.getRepoInstallationAccessToken(owner, repo);

      if (!token) {
        throw new Error('GitHub access token is null!');
      }

      const userConfig =
        await this.collectionRepository.getCollectionConfigByName('user');
      const edgeToRoles = userConfig.edgeToRoles;

      // Get collaborators
      const collaborators = await this.githubService.listRepoCollaborators(owner, repo, token);
      const currCollabRoleMap = new Map<string, string>();
      for (const collaborator of collaborators) {
        currCollabRoleMap.set(collaborator.login, collaborator.role_name);
      }
      const touchedCollaborators = new Set<string>();

      for (const edgeRole of edgeToRoles) {
        const users = await this.graphRepository.getUpstreamVertex<UserDto>(
          repository.vertex.toString(),
          CollectionIndex.User,
          edgeRole.edge,
        );
        for (const user of users) {
          if (!user.collection?.alias || user.collection.alias.length !== 1) {
            continue;
          }
          const username = user.collection.alias[0].username;
          // Skip users in higher roles
          // console.log(`Checking ${username} for ${edgeRole.role}`);
          if (touchedCollaborators.has(username)) {
            // console.log(`Skipping touched ${username}`);
            continue;
          }
          touchedCollaborators.add(username);
          if (
            currCollabRoleMap.has(username) &&
            currCollabRoleMap.get(username) === edgeRole.role
          ) {
            // console.log(`Skipping ${username} (already in role)`);
            continue;
          }
          // console.log(`Adding ${username} as ${edgeRole.role}`);

          try {
            await this.githubService.addRepoCollaborator(
              owner,
              repo,
              username,
              edgeRole.role,
              token,
            );
            completed++;
          } catch (error) {
            failures.push(syncFailure(error));
            this.auditService.recordGraphSync(
              'info',
              'failure',
              `Failed to add ${username} as ${edgeRole.role} to ${owner}/${repo}`,
              undefined, undefined, error,
            );
            continue;
          }
        }
      }

      const removeCollaborators = [...currCollabRoleMap.keys()].filter(
        (x) => !touchedCollaborators.has(x),
      );

      for (const user of removeCollaborators) {
        try {
          await this.githubService.removeRepoCollaborator(owner, repo, user, token);
          completed++;
        } catch (error) {
          failures.push(syncFailure(error));
          this.auditService.recordGraphSync(
            'info',
            'failure',
            `Failed to remove ${user} from ${owner}/${repo}`,
            undefined, undefined, error,
          );
        }
      }

      // sync environments
      if (FEATURE_FLAG_GITHUB_ENVIRONMENT_SYNC) {
        const syncableEnvironments = [
          ENVIRONMENT_NAMES.DEVELOPMENT,
          ENVIRONMENT_NAMES.TEST,
          ENVIRONMENT_NAMES.PRODUCTION,
        ];

        const environmentCollection =
          await this.collectionRepository.getCollections('environment');
        const filteredEnvironmentCollection = environmentCollection.filter(
          (env) => {
            return syncableEnvironments.some(
              (syncableEnvironment) => syncableEnvironment === env.name,
            );
          },
        );

        for (const index in filteredEnvironmentCollection) {
          const environmentName = filteredEnvironmentCollection[index].name;

          await this.removeRepoEnvironmentIfExists(
            owner,
            repo,
            environmentName,
            token,
          );

          let reviewerIds = [];
          if (
            [ENVIRONMENT_NAMES.TEST, ENVIRONMENT_NAMES.PRODUCTION].includes(
              environmentName,
            )
          ) {
            const users = await this.graphRepository.getUpstreamVertex<UserDto>(
              repository.vertex.toString(),
              CollectionIndex.User,
              filteredEnvironmentCollection[index].changeRoles,
            );
            reviewerIds = users
              .filter((user) => {
                return user.collection.alias?.some(
                  (alias) => alias.domain === USER_ALIAS_DOMAIN_GITHUB,
                );
              })
              .map((user) => {
                return parseInt(
                  user.collection.alias.find(
                    (alias) => alias.domain === USER_ALIAS_DOMAIN_GITHUB,
                  ).guid,
                );
              })
              .slice(0, 5); // todo: handle >6 reviewers (github limit)
          }

          const can_admins_bypass = false;
          await this.githubService.updateRepoEnvironment(
            owner,
            repo,
            environmentName,
            reviewerIds.map((userId: number) => {
              return { type: 'User', id: userId };
            }),
            environmentName === ENVIRONMENT_NAMES.PRODUCTION
              ? {
                  protected_branches: false,
                  custom_branch_policies: true,
                }
              : null,
            can_admins_bypass,
            token,
          );
          completed++;

          if (environmentName === ENVIRONMENT_NAMES.PRODUCTION) {
            await this.githubService.addRepoEnvironmentBranchPolicy(
              owner,
              repo,
              environmentName,
              'main',
              'branch',
              token,
            );

            await this.githubService.addRepoEnvironmentBranchPolicy(
              owner,
              repo,
              environmentName,
              'v*',
              'tag',
              token,
            );
          }
        }
      } // FEATURE_FLAG_GITHUB_ENVIRONMENT_SYNC
    } catch (error) {
      failures.push(syncFailure(error));
    }
    if (failures.length > 0) {
      result = {
        state: completed > 0 ? 'partial' : 'failure',
        errorCode: failures.find((failure) => failure.errorCode)?.errorCode,
        errorMessage: failures.map((failure) => failure.errorMessage).join('; '),
      };
    }
    await this.graphService.updateSyncStatus(
      repository,
      'syncUsersStatus',
      'syncAt',
      result,
    );

    this.auditService.recordGraphSync(
      'end',
      syncOutcome(result),
      syncMessage('User sync', repository.scmUrl, result),
      undefined, undefined, result.errorMessage ? result : undefined,
    );
  }

  private getOwnerAndRepoFromUrl(repoUrl: string): {
    owner: string;
    repo: string;
  } {
    const regex = /github\.com[:/](.+?)\/(.+?)(\.git)?$/;
    const match = repoUrl.match(regex);
    if (match && match.length >= 3) {
      return { owner: match[1], repo: match[2] };
    }
    throw new Error('Invalid GitHub URL');
  }

  /**
   * Encrypt a secret using the public key
   * @param publicKey The base64 encoded public key
   * @param secretValue The secret value to encrypt
   * @returns The base64 encoded encrypted secret
   */
  private async encryptSecret(
    publicKey: string,
    secretValue: string,
  ): Promise<string> {
    try {
      await sodium.ready;
      // Convert the base64 public key to a Uint8Array
      const publicKeyUint8Array = sodium.from_base64(
        publicKey,
        sodium.base64_variants.ORIGINAL,
      );

      // Convert the secret value to a Uint8Array
      const secretUint8Array = sodium.from_string(secretValue);

      // Encrypt the secret using the public key
      const encryptedUint8Array = sodium.crypto_box_seal(
        secretUint8Array,
        publicKeyUint8Array,
      );

      // Convert the encrypted Uint8Array to a base64 string
      const encryptedBase64 = sodium.to_base64(
        encryptedUint8Array,
        sodium.base64_variants.ORIGINAL,
      );
      return encryptedBase64;
    } catch (error) {
      console.error('Error encrypting the secret:', error);
      throw error;
    }
  }

  /**
   * Remove an environment from a repository if it exists
   * @param owner The owning organization or user
   * @param repo The repository name
   * @param environment The GitHub environment to get
   * @param token The installation access token
   */
  private async removeRepoEnvironmentIfExists(
    owner: string,
    repo: string,
    environment: string,
    token: string,
  ) {
    if (await this.githubService.getRepoEnvironment(owner, repo, environment, token)) {
      await this.githubService.removeRepoEnvironment(owner, repo, environment, token);
    }
  }
}
