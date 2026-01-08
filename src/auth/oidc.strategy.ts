import * as client from 'openid-client';
import { Strategy } from 'openid-client/passport';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

export const buildOpenIdClient = async () => {
  const config = await client.discovery(
    new URL(process.env.OAUTH2_CLIENT_PROVIDER_OIDC_ISSUER),
    process.env.OAUTH2_CLIENT_REGISTRATION_LOGIN_CLIENT_ID,
    process.env.OAUTH2_CLIENT_REGISTRATION_LOGIN_CLIENT_SECRET,
  );
  return config;
};

@Injectable()
export class OidcStrategy extends Strategy {
  name = 'oidc';
  config: client.Configuration;

  constructor(
    private readonly authService: AuthService,
    config: client.Configuration,
  ) {
    super(
      {
        config: config,
        callbackURL: process.env.OAUTH2_CLIENT_REGISTRATION_LOGIN_REDIRECT_URI,
        scope: process.env.OAUTH2_CLIENT_REGISTRATION_LOGIN_SCOPE,
      },
      async (tokens, verified) => {
        try {
          const claims = tokens.claims();
          const userinfo = await client.fetchUserInfo(
            config,
            tokens.access_token,
            claims?.sub || '',
          );
          const user = {
            id_token: tokens.id_token,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            userinfo,
          };
          verified(null, user);
        } catch (err) {
          verified(err);
        }
      },
    );

    this.config = config;
  }
}
