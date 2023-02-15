import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ForbiddenException, Injectable } from '@nestjs/common';
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
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Invalid JWT sub claim',
        error: `No authorization found for JWT sub claim: ${payload.sub}`,
      });
    }
    if (this.JWT_VALIDATION_JTI_DENY.indexOf(payload.jti) >= 0) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Invalid JWT jti claim',
        error: `Explicit denial registered for JWT jti claim: ${payload.jti}`,
      });
    }
    return payload;
  }
}
