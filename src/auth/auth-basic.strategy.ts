import { BasicStrategy as Strategy } from 'passport-http';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BasicStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    super({
      passReqToCallback: true,
    });
  }

  public validate = async (
    _req: any,
    username: string,
    password: string,
  ): Promise<boolean> => {
    this.auditService.recordAuth(_req, 'start', 'unknown');
    if (
      this.configService.get<string>('HTTP_BASIC_USER') === username &&
      this.configService.get<string>('HTTP_BASIC_PASS') === password
    ) {
      this.auditService.recordAuth(_req, 'end', 'success');
      return true;
    }
    this.auditService.recordAuth(_req, 'end', 'failure');
    throw new UnauthorizedException();
  };
}
