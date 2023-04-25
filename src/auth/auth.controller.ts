import { Controller, Get, Request, Res, UseGuards } from '@nestjs/common';
import { Response, Request as ExpressRequest } from 'express';

import { BrokerOidcRedirectGuard } from './broker-oidc-redirect.guard';
import { Issuer } from 'openid-client';

@Controller('auth')
export class AuthController {
  @UseGuards(BrokerOidcRedirectGuard)
  @Get('/login')
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  login() {}

  @UseGuards(BrokerOidcRedirectGuard)
  @Get('/user')
  user(@Request() req: any) {
    return req.user;
  }

  @UseGuards(BrokerOidcRedirectGuard)
  @Get('/callback')
  loginCallback(@Res() res: Response) {
    res.redirect('/');
  }

  /**
   * Logout user from OIDC
   * @param req
   * @param res
   */
  @Get('/logout')
  async logout(@Request() req: ExpressRequest, @Res() res: Response) {
    const id_token = req.user ? (req.user as any).id_token : undefined;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    req.logout(() => {});
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    req.session.destroy(async (error: any) => {
      const TrustIssuer = await Issuer.discover(
        `${process.env.OAUTH2_CLIENT_PROVIDER_OIDC_ISSUER}/.well-known/openid-configuration`,
      );
      const end_session_endpoint = TrustIssuer.metadata.end_session_endpoint;
      if (end_session_endpoint) {
        res.redirect(
          end_session_endpoint +
            '?post_logout_redirect_uri=' +
            process.env
              .OAUTH2_CLIENT_REGISTRATION_LOGIN_POST_LOGOUT_REDIRECT_URI +
            (id_token ? '&id_token_hint=' + id_token : ''),
        );
      } else {
        res.redirect('/');
      }
    });
  }
}
