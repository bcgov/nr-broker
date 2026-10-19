import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance, isAxiosError } from 'axios';
import {
  BROKER_URL,
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_CLIENT_SECRET,
  USER_ALIAS_DOMAIN_GITHUB,
} from '../constants';
import { AuditService } from '../audit/audit.service';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { UserEntity } from '../persistence/entity/user.entity';

@Injectable()
export class GithubService {
  private readonly axiosInstance: AxiosInstance;

  constructor(
    private readonly auditService: AuditService,
    private readonly systemRepository: SystemRepository,
  ) {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  }

  public isUserAliasEnabled() {
    return GITHUB_OAUTH_CLIENT_ID !== '' && GITHUB_OAUTH_CLIENT_SECRET !== '';
  }

  public async generateAuthorizeUrl(user: UserEntity) {
    const accountId = user.id.toString();
    this.auditService.recordAliasLink(
      user,
      'start',
      'unknown',
      'GitHub Oauth state generated for account link',
    );
    const state = await this.systemRepository.generateUserAliasRequestState(
      accountId,
      USER_ALIAS_DOMAIN_GITHUB,
    );
    return `https://github.com/login/oauth/authorize?client_id=${GITHUB_OAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(this.getUserLinkRedirectUrl())}&scope=read:user&state=${state}`;
  }

  public async isRequestStateMatching(accountId: string, requestState: string) {
    const storedState = await this.systemRepository.getUserAliasRequestState(
      accountId,
      USER_ALIAS_DOMAIN_GITHUB,
    );
    return requestState === storedState;
  }

  private getUserLinkRedirectUrl() {
    return BROKER_URL + '/v1/collection/user/link-github';
  }

  public async getUserAccessToken(code: string) {
    // console.log(code);
    const req = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_OAUTH_CLIENT_ID,
        client_secret: GITHUB_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: this.getUserLinkRedirectUrl(),
      },
      {
        headers: {
          Accept: 'application/json', // Request a JSON response
        },
      },
    );
    return req.data.access_token;
  }

  public async getUserInfo(token: string) {
    const req = await axios.get('https://api.github.com/user', {
      headers: {
        Accept: 'application/json', // Request a JSON response
        Authorization: `token ${token}`,
      },
    });

    return req.data;
  }

  /**
   * Look up the GitHub App installation for a repository.
   * @param jwt The GitHub App JWT
   * @returns The installation id or undefined if the app is not installed
   */
  public async getRepoInstallationId(
    owner: string,
    repo: string,
    jwt: string,
  ): Promise<number | undefined> {
    const response = await this.axiosInstance.get(
      `/repos/${owner}/${repo}/installation`,
      { headers: { Authorization: `Bearer ${jwt}` } },
    );
    return response.data.id;
  }

  /**
   * Look up the GitHub App installation for an organization.
   * @param jwt The GitHub App JWT
   */
  public async getOrgInstallationId(
    org: string,
    jwt: string,
  ): Promise<number> {
    const response = await this.axiosInstance.get(
      `/orgs/${encodeURIComponent(org)}/installation`,
      { headers: { Authorization: `Bearer ${jwt}` } },
    );
    return response.data.id;
  }

  /**
   * Create an installation access token.
   * @param jwt The GitHub App JWT
   * @returns The token and its expiry time (ISO 8601)
   */
  public async createInstallationAccessToken(
    installationId: number,
    jwt: string,
  ): Promise<{ token: string; expires_at: string }> {
    const response = await this.axiosInstance.post(
      `/app/installations/${installationId}/access_tokens`,
      {},
      { headers: { Authorization: `Bearer ${jwt}` } },
    );
    return response.data;
  }

  /**
   * Run a GraphQL query
   * @returns The GraphQL response body (data and errors)
   */
  public async graphql(
    query: string,
    variables: Record<string, unknown>,
    token: string,
  ): Promise<any> {
    const response = await this.axiosInstance.post(
      '/graphql',
      { query, variables },
      { headers: { Authorization: `bearer ${token}` } },
    );
    return response.data;
  }

  /**
   * Read the raw contents of a repository file
   * @returns The file contents or null if the file does not exist
   */
  public async getRepoFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string,
    token: string,
  ): Promise<string | null> {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    try {
      const response = await this.axiosInstance.get(
        `/repos/${owner}/${repo}/contents/${encodedPath}`,
        {
          params: { ref },
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.raw+json',
          },
          responseType: 'text',
          transformResponse: (body) => body,
        },
      );
      return typeof response.data === 'string' ? response.data : null;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create or update a repository Actions secret
   * @param secret The encrypted value and the id of the key used to encrypt it
   */
  public async putRepoActionsSecret(
    owner: string,
    repo: string,
    secretName: string,
    secret: { encrypted_value: string; key_id: string },
    token: string,
  ) {
    await this.axiosInstance.put(
      `/repos/${owner}/${repo}/actions/secrets/${secretName}`,
      secret,
      {
        headers: {
          Authorization: `token ${token}`,
        },
      },
    );
  }

  public async getPublicKey(
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
   * List collaborators of a repository
   * @param owner The owning organization or user
   * @param repo The repository name
   * @param token The installation access token
   * @returns An array of collaborators (See GitHub API documentation)
   */
  public async listRepoCollaborators(
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
  public async addRepoCollaborator(
    owner: string,
    repo: string,
    username: string,
    permission: string,
    token: string,
  ) {
    // try {
    //   await this.axiosInstance.get(`/orgs/${owner}/memberships/${username}`, {
    //     headers: {
    //       Authorization: `token ${token}`,
    //       Accept: 'application/vnd.github+json',
    //       'X-GitHub-Api-Version': '2022-11-28',
    //     },
    //   });
    // } catch (error) {
    //   console.log(error);
    //   return;
    // }
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
  public async removeRepoCollaborator(
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
  public async listRepoEnvironments(
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
  public async getRepoEnvironment(
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
  public async updateRepoEnvironment(
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
  public async addRepoEnvironmentBranchPolicy(
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
  public async updateRepoEnvironmentBranchPolicy(
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
   * Remove an environment from a repository
   * @param owner The owning organization or user
   * @param repo The repository name
   * @param environment The GitHub environment to remove
   * @param token The installation access token
   */
  public async removeRepoEnvironment(
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
