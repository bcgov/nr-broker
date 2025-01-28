import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { lastValueFrom } from 'rxjs';
import sodium from 'libsodium-wrappers';
import * as jwt from 'jsonwebtoken';
import {
  GITHUB_SYNC_CLIENT_ID,
  GITHUB_SYNC_PRIVATE_KEY,
  GITHUB_MANAGED_URL_REGEX,
  VAULT_KV_APPS_MOUNT,
} from '../constants';
import { VaultService } from '../vault/vault.service';
import { ProjectDto } from '../persistence/dto/project.dto';
import { ServiceDto } from '../persistence/dto/service.dto';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { UserDto } from '../persistence/dto/user.dto';
import { RepositoryDto } from '../persistence/dto/repository.dto';
import { CollectionIndex } from '../graph/graph.constants';

@Injectable()
export class GithubSyncService {
  private readonly axiosInstance: AxiosInstance;
  private brokerManagedRegex = new RegExp(GITHUB_MANAGED_URL_REGEX);

  constructor(
    private readonly vaultService: VaultService,
    private readonly graphRepository: GraphRepository,
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

  public async refresh(project: ProjectDto, service: ServiceDto) {
    if (!this.isEnabled()) {
      throw new Error('Not enabled');
    }

    // console.log(`Syncing ${service.name} : ${service.vertex.toString()}`);

    const repositories =
      await this.graphRepository.getDownstreamVertex<RepositoryDto>(
        service.vertex.toString(),
        CollectionIndex.Repository,
        1,
      );
    for (const repositoryUpDown of repositories) {
      const repository = repositoryUpDown.collection;
      // console.log(`Sync ${repository.scmUrl}`);
      if (!this.isBrokerManagedScmUrl(repository.scmUrl)) {
        // console.log(`Skipping ${repository.scmUrl}`);
        continue;
      }
      // console.log(`enabledSyncSecrets: ${repository.enableSyncSecrets}`);
      if (repository.enableSyncSecrets) {
        this.syncSecrets(project, service, repository);
      }
      // console.log(`enabledSyncUsers: ${repository.enableSyncUsers}`);
      if (repository.enableSyncUsers) {
        this.syncUsers(service, repository);
      }
    }
  }

  public async syncSecrets(
    project: ProjectDto,
    service: ServiceDto,
    repository: RepositoryDto,
  ) {
    if (!this.isBrokerManagedScmUrl(repository.scmUrl)) {
      throw new Error('Service does not have Github repo URL to update');
    }
    if (!repository.enableSyncSecrets) {
      throw new Error('Service does not have sync enabled');
    }
    const path = `tools/${project.name}/${service.name}`;
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

  public async syncUsers(service: ServiceDto, repository: RepositoryDto) {
    if (!this.isEnabled()) {
      throw new Error('Not enabled');
    }
    if (!this.isBrokerManagedScmUrl(repository.scmUrl)) {
      throw new Error('Service does not have GitHub repo URL to update');
    }
    if (!repository.enableSyncUsers) {
      throw new Error('Service does not have user sync enabled');
    }

    const { owner, repo } = this.getOwnerAndRepoFromUrl(repository.scmUrl);
    const token = await this.getInstallationAccessToken(owner, repo);

    if (!token) {
      throw new Error('GitHub access token is null!');
    }

    const edgeToRoles = [
      { edge: 'owner', role: 'admin' },
      { edge: 'lead-developer', role: 'maintain' },
      { edge: 'developer', role: 'write' },
      { edge: 'tester', role: 'triage' },
    ];

    // Get collaborators
    const collaborators = await this.listRepoCollaborators(owner, repo, token);
    const touchedCollaborators = new Set<string>();

    for (const edgeRole of edgeToRoles) {
      const users = await this.graphRepository.getUpstreamVertex<UserDto>(
        service.vertex.toString(),
        CollectionIndex.User,
        [edgeRole.edge],
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

        const collaborator = collaborators.find(
          (collaborator: any) => collaborator.login === username,
        );
        if (collaborator && collaborator.role_name === edgeRole.role) {
          // console.log(`Skipping ${username} (already in role)`);
          continue;
        }
        // console.log(`Adding ${username} as ${edgeRole.role}`);

        await this.addRepoCollaborator(
          owner,
          repo,
          user.collection.alias[0].username,
          edgeRole.role,
          token,
        );
      }
    }

    for (const user of []) {
      await this.removeRepoCollaborator(owner, repo, user, token);
    }
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
   * @returns The list of collaborators (See GitHub API documentation)
   */
  private async listRepoCollaborators(
    owner: string,
    repo: string,
    token: string,
  ) {
    // list collaborators
    return (
      await this.axiosInstance.get(
        `/repos/${owner}/${repo}/collaborators?affiliation=direct`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      )
    ).data;
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
}
