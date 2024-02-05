import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import { Request } from 'express';
import { map, tap } from 'rxjs';
import { ActionUtil } from '../util/action.util';

import { ActionError } from '../intention/action.error';
import { AuditService } from '../audit/audit.service';
import { BrokerJwtDto } from '../auth/broker-jwt.dto';
import { TokenService } from '../token/token.service';
import { ActionDto } from '../intention/dto/action.dto';
import { IntentionDto } from '../intention/dto/intention.dto';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { AccountService } from '../collection/account.service';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { randomUUID } from 'crypto';

export class TokenCreateDTO {
  token: string;
}

@Injectable()
export class ProvisionService {
  private readonly logger = new Logger(TokenService.name);
  constructor(
    private readonly actionUtil: ActionUtil,
    private readonly auditService: AuditService,
    private readonly tokenService: TokenService,
    private readonly systemRepository: SystemRepository,
    private readonly accountService: AccountService,
    private readonly collectionRepository: CollectionRepository,
  ) {}

  /**
   * Generates and returns a wrapped secret id to provision an application with
   * @param actionDto The action information
   * @returns A wrapped secret id
   */
  public generateSecretId(
    req: Request,
    intentionDto: IntentionDto,
    actionDto: ActionDto,
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
    intentionDto: IntentionDto,
    actionDto: ActionDto,
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

  async renewToken(
    request: Request,
    ttl: number,
    autorenew: boolean,
  ): Promise<TokenCreateDTO> {
    const actionFailures: ActionError[] = [];
    try {
      const brokerJwt = plainToInstance(BrokerJwtDto, request.user);
      const registryJwt = await this.systemRepository.getRegisteryJwtByClaimJti(
        brokerJwt.jti,
      );
      if (registryJwt && registryJwt.blocked) {
        // JWT should by in block list anyway
        throw new BadRequestException({
          statusCode: 400,
          message: 'Authorization failed',
          error: actionFailures,
        });
      }
      const user = await this.collectionRepository.getCollectionById(
        'user',
        registryJwt.createdUserId.toString(),
      );

      let creatorId: string;
      if (user) creatorId = user.guid;
      else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        creatorId = randomUUID().replace(/-/g, '').substring(0, 12);
      }

      return this.accountService.generateAccountToken(
        request,
        registryJwt.accountId.toString(),
        ttl,
        creatorId,
        autorenew,
      );
    } catch (e) {
      throw e;
    }
  }
}
