import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { map, tap } from 'rxjs';
import { ActionUtil } from '../util/action.util';
import { AuditService } from '../audit/audit.service';
import { TokenService } from '../token/token.service';
import { IntentionEntity } from '../intention/entity/intention.entity';
import { ActionEmbeddable } from '../intention/entity/action.embeddable';

@Injectable()
export class ProvisionService {
  private readonly logger = new Logger(TokenService.name);
  constructor(
    private readonly actionUtil: ActionUtil,
    private readonly auditService: AuditService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Generates and returns a wrapped secret id to provision an application with
   * @param actionDto The action information
   * @returns A wrapped secret id
   */
  public generateSecretId(
    req: Request,
    intentionDto: IntentionEntity,
    actionDto: ActionEmbeddable,
  ) {
    this.auditService.recordIntentionActionUsage(req, intentionDto, actionDto, {
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
        this.actionUtil.resolveVaultEnvironment(actionDto),
      )
      .pipe(
        tap((response) => {
          this.auditService.recordIntentionActionUsage(
            req,
            intentionDto,
            actionDto,
            {
              auth: {
                client_token: response.audit.clientToken,
              },
              event: {
                action: 'generate-secret-id',
                category: 'configuration',
                type: 'creation',
              },
            },
          );
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
  public generateToken(
    req: Request,
    intentionDto: IntentionEntity,
    actionDto: ActionEmbeddable,
    roleId: string,
  ) {
    this.auditService.recordIntentionActionUsage(req, intentionDto, actionDto, {
      event: {
        action: 'generate-token',
        category: 'configuration',
        type: 'start',
      },
    });
    return this.tokenService
      .provisionToken(
        actionDto.service.target
          ? actionDto.service.target.project
          : actionDto.service.project,
        actionDto.service.target
          ? actionDto.service.target.name
          : actionDto.service.name,
        this.actionUtil.resolveVaultEnvironment(actionDto),
        roleId,
      )
      .pipe(
        tap((response) => {
          this.auditService.recordIntentionActionUsage(
            req,
            intentionDto,
            actionDto,
            {
              auth: {
                client_token: response.audit.clientToken,
              },
              event: {
                action: 'generate-token',
                category: 'configuration',
                type: 'creation',
              },
            },
          );
        }),
        map((response) => {
          return response.wrappedToken;
        }),
      );
  }
}
