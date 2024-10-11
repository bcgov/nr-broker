import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  BROKER_URL,
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_CLIENT_SECRET,
  USER_ALIAS_DOMAIN_GITHUB,
} from '../constants';
import { SystemRepository } from '../persistence/interfaces/system.repository';

@Injectable()
export class GithubService {
  constructor(private readonly systemRepository: SystemRepository) {}

  public isUserAliasEnabled() {
    return GITHUB_OAUTH_CLIENT_ID !== '' && GITHUB_OAUTH_CLIENT_SECRET !== '';
  }

  public async generateAuthorizeUrl(accountId: string) {
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
}
