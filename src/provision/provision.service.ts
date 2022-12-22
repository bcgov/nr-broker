import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { TokenService } from '../token/token.service';
import { ActionDto } from '../intention/dto/action.dto';
import { map, tap } from 'rxjs';

@Injectable()
export class ProvisionService {
  private readonly logger = new Logger(TokenService.name);
  constructor(
    private auditService: AuditService,
    private tokenService: TokenService,
  ) {}

  /**
   * Generates and returns a wrapped secret id to provision an application with
   * @param actionDto The action information
   * @returns A wrapped secret id
   */
  public generateSecretId(req: Request, actionDto: ActionDto) {
    this.auditService.recordIntentionActionUsage(req, actionDto, {
      event: {
        action: 'generate-secret-id',
        category: 'configuration',
        type: 'start',
      },
    });
    return this.tokenService
      .provisionSecretId(
        actionDto.service.project,
        actionDto.service.name,
        actionDto.service.environment,
      )
      .pipe(
        tap((response) => {
          this.auditService.recordIntentionActionUsage(req, actionDto, {
            auth: {
              client_token: response.audit.clientToken,
            },
            event: {
              action: 'generate-secret-id',
              category: 'configuration',
              type: 'creation',
            },
          });
        }),
        map((response) => {
          return response.wrappedToken;
        }),
      );
  }

  /**
   * Generates a temporary token for configuration purposes.
   * @param actionDto The action information
   * @param roleId The role id
   * @returns A wrapped token
   */
  public generateToken(req: Request, actionDto: ActionDto, roleId: string) {
    this.auditService.recordIntentionActionUsage(req, actionDto, {
      event: {
        action: 'generate-token',
        category: 'configuration',
        type: 'start',
      },
    });
    return this.tokenService
      .provisionToken(
        actionDto.service.project,
        actionDto.service.name,
        actionDto.service.environment,
        roleId,
      )
      .pipe(
        tap((response) => {
          this.auditService.recordIntentionActionUsage(req, actionDto, {
            auth: {
              client_token: response.audit.clientToken,
            },
            event: {
              action: 'generate-token',
              category: 'configuration',
              type: 'creation',
            },
          });
        }),
        map((response) => {
          return response.wrappedToken;
        }),
      );
  }
}
