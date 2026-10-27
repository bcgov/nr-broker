import { Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { GITHUB_SYNC_CLIENT_ID, GITHUB_SYNC_PRIVATE_KEY } from '../constants';
import { GithubService } from './github.service';

interface InstallationToken {
  token: string;
  expiresAt: number;
}

const TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000;

/**
 * Creates and caches GitHub App credentials: the app JWT and installation
 * access tokens.
 */
@Injectable()
export class GithubTokenService {
  private readonly logger = new Logger(GithubTokenService.name);
  private readonly orgTokens = new Map<string, InstallationToken>();

  constructor(private readonly githubService: GithubService) {}

  public generateJWT(): string {
    const payload = {
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) + 2 * 60, // JWT expires in 2 minutes
      iss: GITHUB_SYNC_CLIENT_ID,
    };
    return jwt.sign(payload, GITHUB_SYNC_PRIVATE_KEY, { algorithm: 'RS256' });
  }

  /**
   * Get an installation access token for a repository.
   * @returns The token or undefined if the app is not authorized for the
   * repository
   */
  public async getRepoInstallationAccessToken(
    owner: string,
    repo: string,
  ): Promise<string | undefined> {
    const appJwt = this.generateJWT();
    try {
      const installationId = await this.githubService.getRepoInstallationId(
        owner,
        repo,
        appJwt,
      );
      if (installationId) {
        const response = await this.githubService.createInstallationAccessToken(
          installationId,
          appJwt,
        );
        if (response.token) return response.token;
      }
    } catch (error) {
      this.logger.error(
        `Github App has not been authorized to access ${owner}/${repo}`,
      );
    }
  }

  /**
   * Get an installation access token for an organization. Tokens are cached
   * until shortly before they expire.
   */
  public async getOrgInstallationToken(org: string): Promise<string> {
    const cached = this.orgTokens.get(org);
    if (cached && cached.expiresAt - TOKEN_EXPIRY_MARGIN_MS > Date.now()) {
      return cached.token;
    }

    const appJwt = this.generateJWT();
    const installationId = await this.githubService.getOrgInstallationId(
      org,
      appJwt,
    );
    const response = await this.githubService.createInstallationAccessToken(
      installationId,
      appJwt,
    );
    const token: InstallationToken = {
      token: response.token,
      expiresAt: new Date(response.expires_at).getTime(),
    };
    this.orgTokens.set(org, token);
    return token.token;
  }
}
