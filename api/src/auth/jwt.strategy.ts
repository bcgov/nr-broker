import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWT_MAX_AGE } from '../constants';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { JwtKeyService } from './jwt-key.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly JWT_SKIP_VALIDATION = process.env.JWT_SKIP_VALIDATION
    ? process.env.JWT_SKIP_VALIDATION === 'true'
    : false;

  constructor(
    readonly configService: ConfigService,
    private readonly systemRepository: SystemRepository,
    private readonly jwtKeyService: JwtKeyService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    const hasRsaKeys = jwtKeyService.hasKeys();

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      algorithms: [
        ...(jwtSecret ? ['HS256'] : []),
        ...(hasRsaKeys ? ['RS256'] : []),
      ],
      secretOrKeyProvider: (
        _request: any,
        rawJwtToken: string,
        done: (err: any, key?: string) => void,
      ) => {
        try {
          const headerB64 = rawJwtToken.split('.')[0];
          const header = JSON.parse(
            Buffer.from(headerB64, 'base64url').toString(),
          );
          if (header.alg === 'RS256' && hasRsaKeys) {
            if (!header.kid) {
              done(new Error('RS256 token missing kid header'));
              return;
            }
            const publicKey = jwtKeyService.getPublicKeyByKid(header.kid);
            if (!publicKey) {
              done(new Error(`Unknown key id: ${header.kid}`));
              return;
            }
            done(null, publicKey);
          } else if (header.alg === 'HS256' && jwtSecret) {
            done(null, jwtSecret);
          } else {
            done(new Error('Unsupported JWT algorithm'));
          }
        } catch (err) {
          done(err);
        }
      },
      jsonWebTokenOptions: {
        maxAge: JWT_MAX_AGE,
      },
    } as StrategyOptionsWithRequest);
  }

  public async validate(_req: any, payload: any) {
    if (
      !this.JWT_SKIP_VALIDATION &&
      !(await this.systemRepository.jwtMatchesAllowed(payload))
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Invalid JWT',
        error: 'Allow list has no match',
      });
    }
    if (
      !this.JWT_SKIP_VALIDATION &&
      (await this.systemRepository.jwtMatchesBlocked(payload))
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Invalid JWT',
        error: 'Block list has match',
      });
    }
    return payload;
  }
}
