import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import sodium from 'libsodium-wrappers';
import { Job } from 'bullmq';
import { MikroORM } from '@mikro-orm/core';
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
import { CreateRequestContext } from '@mikro-orm/decorators/legacy';

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

    if (!this.isBrokerManagedScmUrl(repository.scmUrl)) {
      this.auditService.recordToolsSync(
        'info',
        'unknown',
        `Skip sync of unmanaged url (${repository.id})`,
      );
      return;
    }

    this.auditService.recordToolsSync(
      'info',
      'unknown',
      `Sync repository (${repository.id})`,
    );

    if (syncUsers && repository.enableSyncUsers) {
      await this.syncUsers(repository);
    }

    if (syncSecrets && repository.enableSyncSecrets) {
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
          this.auditService.recordToolsSync(
            'info',
            'unknown',
            `Skip sync: ${service.name}`,
            'Unknown',
            service.name,
          );
          continue;
        }
        const project = projectDtoArr[0].collection;

        await this.syncSecrets(project, service, repository);
      }
    }
  }

  public async syncSecrets(
    project: ProjectDto,
    service: ServiceDto,
    repository: RepositoryEntity,
  ) {
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
        }
      }
    } catch (error) {
      this.auditService.recordToolsSync(
        'end',
        'failure',
        `End secret sync: ${repository.scmUrl}`,
        project.name,
        service.name,
      );
      return;
    }

    await this.graphService.updateSyncStatus(
      repository,
      'syncSecretsStatus',
      'syncAt',
    );

    this.auditService.recordToolsSync(
      'end',
      'success',
      `End secret sync: ${repository.scmUrl}`,
      project.name,
      service.name,
    );
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

    try {
      this.auditService.recordToolsSync(
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
      let collaborators: any[];
      try {
        collaborators = await this.githubService.listRepoCollaborators(owner, repo, token);
      } catch (error) {
        this.auditService.recordToolsSync(
          'end',
          'failure',
          `Failed to list GitHub collaborators for ${owner}/${repo}`,
        );
        return;
      }
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
          } catch (error) {
            this.auditService.recordToolsSync(
              'end',
              'failure',
              `Failed to add ${username} as ${edgeRole.role} to ${owner}/${repo}`,
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
        } catch (error) {
          this.auditService.recordToolsSync(
            'end',
            'failure',
            `Failed to remove ${user} from ${owner}/${repo}`,
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

      await this.graphService.updateSyncStatus(
        repository,
        'syncUsersStatus',
        'syncAt',
      );

      this.auditService.recordToolsSync(
        'end',
        'success',
        `End user sync: ${repository.scmUrl}`,
      );
    } catch (error) {
      this.auditService.recordToolsSync(
        'end',
        'failure',
        `End user sync: ${repository.scmUrl}`,
      );
    }
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
      // throw new Error('Failed to encrypt the secret.');
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
