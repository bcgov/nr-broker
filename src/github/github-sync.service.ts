import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { lastValueFrom } from 'rxjs';
import sodium from 'libsodium-wrappers';
import * as jwt from 'jsonwebtoken';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CreateRequestContext, MikroORM } from '@mikro-orm/core';
import {
  GITHUB_SYNC_CLIENT_ID,
  GITHUB_SYNC_PRIVATE_KEY,
  GITHUB_MANAGED_URL_REGEX,
  VAULT_KV_APPS_MOUNT,
  REDIS_QUEUES,
  CRON_JOB_SYNC_USERS,
  CRON_JOB_SYNC_SECRETS,
  FEATURE_FLAG_GITHUB_ENVIRONMENT_SYNC,
  USER_ALIAS_DOMAIN_GITHUB,
} from '../constants';
import { ENVIRONMENT_NAMES } from '../intention/dto/constants.dto';
import { AuditService } from '../audit/audit.service';
import { VaultService } from '../vault/vault.service';
import { CollectionIndex } from '../graph/graph.constants';
import { RedisService } from '../redis/redis.service';
import { ProjectDto } from '../persistence/dto/project.dto';
import { ServiceDto } from '../persistence/dto/service.dto';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { UserDto } from '../persistence/dto/user.dto';
import { RepositoryDto } from '../persistence/dto/repository.dto';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { BrokerAccountEntity } from '../persistence/entity/broker-account.entity';
import { CollectionNameEnum } from '../persistence/entity/collection-entity-union.type';
import { RepositoryEntity } from '../persistence/entity/repository.entity';
import { GraphService } from '../graph/graph.service';
import { JobQueueUtil } from '../util/job-queue.util';

@Injectable()
export class GithubSyncService {
  private readonly axiosInstance: AxiosInstance;
  private brokerManagedRegex = new RegExp(GITHUB_MANAGED_URL_REGEX);

  constructor(
    private readonly auditService: AuditService,
    private readonly vaultService: VaultService,
    private readonly redisService: RedisService,
    private readonly graphService: GraphService,
    private readonly graphRepository: GraphRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly jobQueueUtil: JobQueueUtil,
    // used by: @CreateRequestContext()
    private readonly orm: MikroORM,
  ) {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });
  }

  public isEnabled() {
    return GITHUB_SYNC_CLIENT_ID !== '' && GITHUB_SYNC_PRIVATE_KEY !== '';
  }

  public isBrokerManagedScmUrl(scmUrl: string) {
    if (!scmUrl) {
      return false;
    }
    return this.brokerManagedRegex.test(scmUrl);
  }

  public async refreshByAccount(account: BrokerAccountEntity) {
    const downstreamServices =
      await this.graphRepository.getDownstreamVertex<ServiceDto>(
        account.vertex.toString(),
        CollectionNameEnum.service,
        4,
      );
    if (downstreamServices) {
      for (const serviceUpDown of downstreamServices) {
        const service = serviceUpDown.collection;
        this.refreshByService(service, true, false);
      }
    }
  }

  public async refreshByService(
    service: ServiceDto,
    syncSecrets: boolean,
    syncUsers: boolean,
  ) {
    // console.log(`Syncing ${service.name} : ${service.vertex.toString()}`);

    const repositories =
      await this.graphRepository.getDownstreamVertex<RepositoryDto>(
        service.vertex.toString(),
        CollectionIndex.Repository,
        1,
      );
    for (const repositoryUpDown of repositories) {
      const repository = repositoryUpDown.collection;
      await this.refresh(repository, syncSecrets, syncUsers);
    }
  }

  async refresh(
    repository: RepositoryDto,
    syncSecrets: boolean,
    syncUsers: boolean,
  ): Promise<void> {
    if (!this.isEnabled()) {
      this.auditService.recordToolsSync(
        'info',
        'failure',
        'Github is not setup',
      );
      throw new ServiceUnavailableException();
    }
    const entity = await this.collectionRepository.getCollectionById(
      'repository',
      repository.id,
    );

    // Queue the sync
    if (syncSecrets) {
      // console.log(REDIS_QUEUES.GITHUB_SYNC_SECRETS, repository.id);
      this.redisService.queue(REDIS_QUEUES.GITHUB_SYNC_SECRETS, repository.id);

      await this.graphService.updateSyncStatus(
        entity,
        'syncSecretsStatus',
        'queuedAt',
      );
    }
    if (syncUsers) {
      // console.log(REDIS_QUEUES.GITHUB_SYNC_USERS, repository.id);
      this.redisService.queue(REDIS_QUEUES.GITHUB_SYNC_USERS, repository.id);

      await this.graphService.updateSyncStatus(
        entity,
        'syncUsersStatus',
        'queuedAt',
      );
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS, {
    name: CRON_JOB_SYNC_SECRETS,
  })
  @CreateRequestContext()
  async pollRefreshCronSecrets(): Promise<void> {
    await this.jobQueueUtil.refreshJobWrap(
      this.schedulerRegistry,
      CRON_JOB_SYNC_SECRETS,
      REDIS_QUEUES.GITHUB_SYNC_SECRETS,
      () =>
        this.redisService.dequeue(REDIS_QUEUES.GITHUB_SYNC_SECRETS) as Promise<
          string | null
        >,
      async (id: string) => {
        return this.runRefresh(id, true, false);
      },
    );
  }

  @Cron(CronExpression.EVERY_30_SECONDS, {
    name: CRON_JOB_SYNC_USERS,
  })
  @CreateRequestContext()
  async pollRefreshCronUsers(): Promise<void> {
    await this.jobQueueUtil.refreshJobWrap(
      this.schedulerRegistry,
      CRON_JOB_SYNC_USERS,
      REDIS_QUEUES.GITHUB_SYNC_USERS,
      () =>
        this.redisService.dequeue(REDIS_QUEUES.GITHUB_SYNC_USERS) as Promise<
          string | null
        >,
      async (id: string) => {
        return this.runRefresh(id, false, true);
      },
    );
  }

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
    const token = await this.getInstallationAccessToken(owner, repo);
    const filteredSecretName = secretName.replace(/[^a-zA-Z0-9_]/g, '_');

    if (!token) {
      throw new Error('GitHub access token is null!');
    }
    const { key: base64PublicKey, key_id: keyId } = await this.getPublicKey(
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
    await this.axiosInstance.put(
      `/repos/${owner}/${repo}/actions/secrets/${filteredSecretName}`,
      {
        encrypted_value: encryptedSecret,
        key_id: keyId,
      },
      {
        headers: {
          Authorization: `token ${token}`,
        },
      },
    );
  }

  public async syncUsers(repository: RepositoryEntity) {
    if (!this.isEnabled()) {
      throw new Error('Not enabled');
    }
    if (!this.isBrokerManagedScmUrl(repository.scmUrl)) {
      throw new Error('Service does not have GitHub repo URL to update');
    }
    if (!repository.enableSyncUsers) {
      throw new Error('Service does not have user sync enabled');
    }

    this.auditService.recordToolsSync(
      'start',
      'unknown',
      `Start user sync: ${repository.scmUrl}`,
    );

    const { owner, repo } = this.getOwnerAndRepoFromUrl(repository.scmUrl);
    const token = await this.getInstallationAccessToken(owner, repo);

    if (!token) {
      throw new Error('GitHub access token is null!');
    }

    const userConfig =
      await this.collectionRepository.getCollectionConfigByName('user');
    const edgeToRoles = userConfig.edgeToRoles;

    // Get collaborators
    const collaborators = await this.listRepoCollaborators(owner, repo, token);
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

        await this.addRepoCollaborator(
          owner,
          repo,
          username,
          edgeRole.role,
          token,
        );
      }
    }

    const removeCollaborators = [...currCollabRoleMap.keys()].filter(
      (x) => !touchedCollaborators.has(x),
    );

    for (const user of removeCollaborators) {
      await this.removeRepoCollaborator(owner, repo, user, token);
    }

    //sync environments
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
            .slice(0, 5); //todo: handle >6 reviewers (github limit)
        }

        const can_admins_bypass = false;
        await this.updateRepoEnvironment(
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
          await this.addRepoEnvironmentBranchPolicy(
            owner,
            repo,
            environmentName,
            'main',
            'branch',
            token,
          );

          await this.addRepoEnvironmentBranchPolicy(
            owner,
            repo,
            environmentName,
            'v*',
            'tag',
            token,
          );
        }
      }
    } //FEATURE_FLAG_GITHUB_ENVIRONMENT_SYNC

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
  }

  // Generate JWT
  private generateJWT(): string {
    const payload = {
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) + 2 * 60, // JWT expires in 2 minutes
      iss: GITHUB_SYNC_CLIENT_ID,
    };
    return jwt.sign(payload, GITHUB_SYNC_PRIVATE_KEY, { algorithm: 'RS256' });
  }

  private async getInstallationId(
    owner: string,
    repo: string,
    token: string,
  ): Promise<string> {
    try {
      const response = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/installation`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.data.id) return response.data.id;
    } catch (error) {
      console.error(
        `Catch error on make API call on get Installation ID for ${owner}/${repo}`,
      );
      //throw new Error('Failed to get installation id.');
    }
  }

  private async getInstallationAccessToken(
    owner: string,
    repo: string,
  ): Promise<string> {
    const token = this.generateJWT();
    try {
      const installationId = await this.getInstallationId(owner, repo, token);
      if (installationId) {
        const response = await this.axiosInstance.post(
          `/app/installations/${installationId}/access_tokens`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (response.data.token) return response.data.token;
      }
    } catch (error) {
      console.error(
        `Github App has not been authorized to access ${owner}/${repo}`,
      );
      //throw new Error('Failed to get access token.');
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

  private async getPublicKey(
    owner: string,
    repo: string,
    accessToken: string,
  ): Promise<any> {
    const url = `https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    return response.data;
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
      //throw new Error('Failed to encrypt the secret.');
    }
  }

  /**
   * List collaborators of a repository
   * @param owner The owning organization or user
   * @param repo The repository name
   * @param token The installation access token
   * @returns An array of collaborators (See GitHub API documentation)
   */
  private async listRepoCollaborators(
    owner: string,
    repo: string,
    token: string,
  ): Promise<any[]> {
    let collaborators: any[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/collaborators`,
        {
          params: {
            per_page: 100,
            page,
            affiliation: 'direct',
          },
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );

      collaborators = collaborators.concat(response.data);

      // Check if there is a "next" page in the Link header
      const linkHeader = response.headers.link;
      hasNextPage = linkHeader?.includes('rel="next"') ?? false;

      page++;
    }

    return collaborators;
  }

  /**
   * Add a collaborator to a repository
   * @param owner The owning organization or user
   * @param repo The repository name
   * @param username The GitHub username to add as a collaborator
   * @param permission The permission level to grant the collaborator
   * @param token The installation access token
   */
  private async addRepoCollaborator(
    owner: string,
    repo: string,
    username: string,
    permission: string,
    token: string,
  ) {
    try {
      await this.axiosInstance.get(`/orgs/${owner}/memberships/${username}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
    } catch (error) {
      console.log(error);
      return;
    }
    await this.axiosInstance.put(
      `/repos/${owner}/${repo}/collaborators/${username}`,
      {
        permission,
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
  }

  /**
   * Remove a collaborator from a repository
   * @param owner The owning organization or user
   * @param repo The repository name
   * @param username The GitHub username to remove as a collaborator
   * @param token The installation access token
   */
  private async removeRepoCollaborator(
    owner: string,
    repo: string,
    username: string,
    token: string,
  ) {
    await this.axiosInstance.delete(
      `/repos/${owner}/${repo}/collaborators/${username}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
  }

  /**
   * Add or update a repo environment
   * @param owner The owning organization or user
   * @param repo The repository name
   * @param token The installation access token
   * @returns An array of environments (See GitHub API documentation)
   */
  private async listRepoEnvironments(
    owner: string,
    repo: string,
    token: string,
  ): Promise<any[]> {
    let environments: any[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/environments`,
        {
          params: {
            per_page: 100,
            page,
          },
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );

      environments = environments.concat(...response.data.environments);

      // Check if there is a "next" page in the Link header
      const linkHeader = response.headers.link;
      hasNextPage = linkHeader?.includes('rel="next"') ?? false;

      page++;
    }

    return environments;
  }

  /**
   * Get a repo environment
   * @param owner The owning organization or user
   * @param repo The repository name
   * @param environment The environment name
   * @param token The installation access token
   * @returns An environment (See GitHub API documentation)
   */
  private async getRepoEnvironment(
    owner: string,
    repo: string,
    environment: string,
    token: string,
  ): Promise<any> {
    const response = await this.axiosInstance
      .get(`/repos/${owner}/${repo}/environments/${environment}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })
      .catch((err) => {
        if (err.response) {
          return err.response.data;
        }
      });
    return response.data;
  }

  /**
   * Add or update a repo environment
   * @param owner The owning organization or user
   * @param repo The repository name
   * @param environment The GitHub environment to add/update
   * @param reviewerIds Array of user ids who will approve deployments to this environment
   * @param token The installation access token
   */
  private async updateRepoEnvironment(
    owner: string,
    repo: string,
    environment: string,
    reviewerIds: { type: 'User' | 'Team'; id: number }[],
    deployment_branch_policy: {
      protected_branches: boolean;
      custom_branch_policies: boolean;
    },
    can_admins_bypass: boolean,
    token: string,
  ) {
    await this.axiosInstance.put(
      `/repos/${owner}/${repo}/environments/${environment}`,
      {
        reviewers: reviewerIds,
        deployment_branch_policy: deployment_branch_policy,
        can_admins_bypass: can_admins_bypass,
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
  }

  /**
   * Update a repo environment branch policy
   * @param owner The owning organization or user
   * @param repo The repository name
   * @param environment The GitHub environment to update
   * @param branchPattern The name pattern that branches must match to deploy to this environment
   * @param patternType Whether this rule targets a branch or tag. Can be one of: branch, tag.
   * @param token The installation access token
   * @returns Id for the created branch policy
   */
  private async addRepoEnvironmentBranchPolicy(
    owner: string,
    repo: string,
    environment: string,
    branchPattern: string,
    patternType: string,
    token: string,
  ) {
    await this.axiosInstance.post(
      `/repos/${owner}/${repo}/environments/${environment}/deployment-branch-policies`,
      {
        name: branchPattern,
        type: patternType,
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
  }

  /**
   * Update a repo environment branch policy
   * @param owner The owning organization or user
   * @param repo The repository name
   * @param environment The GitHub environment to update
   * @param branchPolicyId The GitHub branch policy id to update
   * @param branchPattern The name pattern that branches must match to deploy to this environment
   * @param token The installation access token
   */
  private async updateRepoEnvironmentBranchPolicy(
    owner: string,
    repo: string,
    environment: string,
    branchPolicyId: number,
    branchPattern: string,
    token: string,
  ) {
    await this.axiosInstance.put(
      `/repos/${owner}/${repo}/environments/${environment}/deployment-branch-policies/${branchPolicyId}`,
      {
        name: branchPattern,
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
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
    if (await this.getRepoEnvironment(owner, repo, environment, token)) {
      await this.removeRepoEnvironment(owner, repo, environment, token);
    }
  }

  /**
   * Remove an environment from a repository
   * @param owner The owning organization or user
   * @param repo The repository name
   * @param environment The GitHub environment to remove
   * @param token The installation access token
   */
  private async removeRepoEnvironment(
    owner: string,
    repo: string,
    environment: string,
    token: string,
  ) {
    await this.axiosInstance.delete(
      `/repos/${owner}/${repo}/environments/${environment}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
  }
}
