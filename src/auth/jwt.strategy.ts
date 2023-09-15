import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWT_MAX_AGE } from '../constants';
import { SystemRepository } from '../persistence/interfaces/system.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly JWT_SKIP_VALIDATION = process.env.JWT_SKIP_VALIDATION
    ? process.env.JWT_SKIP_VALIDATION === 'true'
    : false;

  constructor(
    readonly configService: ConfigService,
    private readonly systemRepository: SystemRepository,
  ) {
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
    if (
      !this.JWT_SKIP_VALIDATION &&
      !(await this.systemRepository.jwtMatchesAllowed(payload))
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Invalid JWT',
        error: `Allow list has no match`,
      });
    }
    if (
      !this.JWT_SKIP_VALIDATION &&
      (await this.systemRepository.jwtMatchesBlocked(payload))
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Invalid JWT',
        error: `Block list has match`,
      });
    }
    return payload;
  }
}
