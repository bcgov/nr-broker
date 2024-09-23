import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { lastValueFrom } from 'rxjs';
import sodium from 'libsodium-wrappers';
import * as jwt from 'jsonwebtoken';
import {
  GITHUB_CLIENT_ID,
  GITHUB_MANAGED_URL_REGEX,
  GITHUB_PRIVATE_KEY,
  VAULT_KV_APPS_MOUNT,
} from '../constants';
import { VaultService } from '../vault/vault.service';

@Injectable()
export class GithubService {
  private readonly axiosInstance: AxiosInstance;
  private brokerManagedRegex = new RegExp(GITHUB_MANAGED_URL_REGEX);

  constructor(private readonly vaultService: VaultService) {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });
  }

  public isEnabled() {
    return GITHUB_CLIENT_ID !== '' && GITHUB_PRIVATE_KEY !== '';
  }

  public isBrokerManagedScmUrl(scmUrl: string) {
    if (!scmUrl) {
      return false;
    }
    return this.brokerManagedRegex.test(scmUrl);
  }

  public async refresh(project: string, service: string, scmUrl: string) {
    if (!this.isEnabled()) {
      throw new Error('Not enabled');
    }
    if (!this.isBrokerManagedScmUrl(scmUrl)) {
      throw new Error('Service does not have Github repo URL to update');
    }
    const path = `tools/${project}/${service}`;
    const kvData = await lastValueFrom(
      this.vaultService.getKv(VAULT_KV_APPS_MOUNT, path),
    );
    if (kvData) {
      for (const [secretName, secretValue] of Object.entries(kvData)) {
        await this.updateSecret(scmUrl, secretName, secretValue.toString());
      }
    }
  }

  public async updateSecret(
    repoUrl: string,
    secretName: string,
    secretValue: string,
  ): Promise<void> {
    const { owner, repo } = this.getOwnerAndRepoFromUrl(repoUrl);
    const token = await this.getInstallationAccessToken(owner, repo);
    const filteredSecretName = secretName.replace(/[^a-zA-Z0-9_]/g, '_');

    if (!token) {
      throw new Error('Github access token is null!');
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

  // Generate JWT
  private generateJWT(): string {
    const payload = {
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) + 2 * 60, // JWT expires in 2 minutes
      iss: GITHUB_CLIENT_ID,
    };
    return jwt.sign(payload, GITHUB_PRIVATE_KEY, { algorithm: 'RS256' });
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
}
