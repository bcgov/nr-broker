import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWT_MAX_AGE } from '../constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly JWT_VALIDATION_SUB = process.env.JWT_VALIDATION_SUB
    ? process.env.JWT_VALIDATION_SUB.split(',')
    : [];

  private readonly JWT_VALIDATION_JTI_DENY = process.env.JWT_VALIDATION_JTI_DENY
    ? process.env.JWT_VALIDATION_JTI_DENY.split(',')
    : [];

  constructor(readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      jsonWebTokenOptions: {
        maxAge: JWT_MAX_AGE,
      },
    });
  }

  public async validate(_req: any, payload: any) {
    if (this.JWT_VALIDATION_SUB.indexOf(payload.sub) === -1) {
      return null;
    }
    if (this.JWT_VALIDATION_JTI_DENY.indexOf(payload.jti) >= 0) {
      return null;
    }
    return payload;
  }
}
