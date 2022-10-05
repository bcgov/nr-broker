import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { TokenService } from '../token/token.service';
import { ActionDto } from '../intention/dto/action.dto';

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
        type: 'creation',
      },
    });
    return this.tokenService.provisionSecretId(
      actionDto.service.project,
      actionDto.service.name,
      actionDto.service.environment,
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
        type: 'creation',
      },
    });
    return this.tokenService.provisionToken(
      actionDto.service.project,
      actionDto.service.name,
      actionDto.service.environment,
      roleId,
    );
  }
}
