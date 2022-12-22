import { BasicStrategy as Strategy } from 'passport-http';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { BrokerJwtDto } from './broker-jwt.dto';

@Injectable()
export class BasicStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      passReqToCallback: true,
    });
  }

  public validate = async (
    _req: any,
    username: string,
    password: string,
  ): Promise<BrokerJwtDto | null> => {
    if (
      this.configService.get<string>('HTTP_BASIC_USER') === username &&
      this.configService.get<string>('HTTP_BASIC_PASS') === password
    ) {
      const MILLISECONDS_IN_SECOND = 1000;
      const DAYS_30_IN_SECONDS = 60 * 60 * 24 * 30;
      const ISSUED_AT = Math.floor(Date.now() / MILLISECONDS_IN_SECOND);

      return {
        exp: ISSUED_AT + DAYS_30_IN_SECONDS,
        iat: ISSUED_AT,
        nbf: ISSUED_AT,
        jti: randomUUID(),
        sub: 'oneteam@victoria1.gov.bc.ca',
      };
    }
    return null;
  };
}
