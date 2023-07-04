import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { plainToInstance } from 'class-transformer';
import ejs from 'ejs';
import { IntentionDto } from './dto/intention.dto';
import {
  INTENTION_DEFAULT_TTL_SECONDS,
  INTENTION_MAX_TTL_SECONDS,
  INTENTION_MIN_TTL_SECONDS,
  IS_PRIMARY_NODE,
} from '../constants';
import { AuditService } from '../audit/audit.service';
import { ActionService } from './action.service';
import { ActionError } from './action.error';
import { BrokerJwtDto } from '../auth/broker-jwt.dto';
import { IntentionRepository } from '../persistence/interfaces/intention.repository';
import { IntentionSyncService } from '../persistence/intention-sync.service';
import { ActionDto } from './dto/action.dto';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { JwtRegistryDto } from '../persistence/dto/jwt-registry.dto';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { BrokerAccountProjectMapDto } from '../persistence/dto/graph-data.dto';

export interface IntentionOpenResponse {
  actions: any;
  token: string;
  transaction_id: string;
  expiry: string;
}

@Injectable()
export class IntentionService {
  private readonly AUDIT_URL_TEMPLATE = process.env.AUDIT_URL_TEMPLATE
    ? process.env.AUDIT_URL_TEMPLATE
    : '';

  constructor(
    private readonly auditService: AuditService,
    private readonly actionService: ActionService,
    private readonly intentionSync: IntentionSyncService,
    private readonly graphRepository: GraphRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly intentionRepository: IntentionRepository,
    private readonly systemRepository: SystemRepository,
  ) {}

  /**
   * Opens an intention after validating its details.
   * @param req The associated request object
   * @param intentionDto The intention dto to validate
   * @param ttl The requested time in seconds to live for this intention
   * @returns The intention response or throws an error upon validation failure
   */
  public async open(
    req: Request,
    intentionDto: IntentionDto,
    ttl: number = INTENTION_DEFAULT_TTL_SECONDS,
  ): Promise<IntentionOpenResponse> {
    const startDate = new Date();
    const actions = {};
    const actionFailures: ActionError[] = [];
    const envMap = await this.intentionSync.getEnvMap();
    if (ttl < INTENTION_MIN_TTL_SECONDS || ttl > INTENTION_MAX_TTL_SECONDS) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'TTL out of bounds',
        error: `TTL must be between ${INTENTION_MIN_TTL_SECONDS} and ${INTENTION_MAX_TTL_SECONDS}`,
      });
    }
    // Annotate intention event
    intentionDto.transaction = {
      ...this.createTokenAndHash(),
      start: startDate.toISOString(),
    };
    intentionDto.jwt = plainToInstance(BrokerJwtDto, req.user);
    intentionDto.expiry = startDate.valueOf() + ttl * 1000;
    const registryJwt = await this.systemRepository.getRegisteryJwtByClaimJti(
      intentionDto.jwt.jti,
    );
    let accountBoundProjects: BrokerAccountProjectMapDto | null = null;
    if (registryJwt && registryJwt.blocked) {
      // JWT should by in block list anyway
      throw new BadRequestException({
        statusCode: 400,
        message: 'Authorization failed',
        error: actionFailures,
      });
    }
    const account = await this.getAccount(registryJwt);
    intentionDto.requireRoleId = true;
    if (account) {
      intentionDto.accountId = registryJwt.accountId;
      intentionDto.requireRoleId = account.requireRoleId;
      accountBoundProjects =
        await this.graphRepository.getBrokerAccountServices(
          account.vertex.toString(),
        );
      // console.log(accountBoundProjects);
    }

    for (const action of intentionDto.actions) {
      const envDto = envMap[action.service.environment];
      if (
        action.vaultEnvironment === undefined &&
        envDto &&
        (envDto.name === 'production' ||
          envDto.name === 'test' ||
          envDto.name === 'development' ||
          envDto.name === 'tools')
      ) {
        action.vaultEnvironment = envDto.name;
      }
      const validationResult = this.actionService.validate(
        intentionDto,
        action,
        accountBoundProjects,
        account && !!account.requireProjectExists,
        account && !!account.requireServiceExists,
      );
      action.valid = validationResult === null;
      if (!action.valid) {
        actionFailures.push(validationResult);
      }
      action.transaction = intentionDto.transaction;
      action.user = intentionDto.user;
      action.trace = this.createTokenAndHash();
      actions[action.id] = {
        token: action.trace.token,
        trace_id: action.trace.hash,
        outcome: validationResult === null ? 'success' : 'failure',
      };
    }
    const isSuccessfulOpen = actionFailures.length === 0;
    this.auditService.recordIntentionOpen(req, intentionDto, isSuccessfulOpen);
    this.auditService.recordActionAuthorization(req, intentionDto);
    if (!isSuccessfulOpen) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Authorization failed',
        error: actionFailures,
      });
    }
    await this.intentionRepository.addIntention(intentionDto);
    return {
      actions,
      token: intentionDto.transaction.token,
      transaction_id: intentionDto.transaction.hash,
      expiry: new Date(intentionDto.expiry).toUTCString(),
    };
  }

  /**
   * Closes the intention.
   * @param req The associated request object
   * @param token The intention token
   * @param outcome The outcome of the intention
   * @param reason The reason for the outcome
   * @returns Promise returning true if successfully closed and false otherwise
   */
  public async close(
    req: Request,
    token: string,
    outcome: 'failure' | 'success' | 'unknown',
    reason: string | undefined,
  ): Promise<IntentionDto> {
    const intention: IntentionDto =
      await this.intentionRepository.getIntentionByToken(token);
    if (!intention) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Intention not found',
      });
    }
    await this.finalizeIntention(intention, outcome, reason, req);
    return intention;
  }

  public async search(whereClause: string, offset = 0, limit = 5) {
    try {
      // must await to catch error
      return await this.intentionRepository.searchIntentions(
        JSON.parse(whereClause),
        offset,
        limit,
      );
    } catch (e) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal search arguement',
        error: `Check parameters for errors`,
      });
    }
  }

  private finalizeIntention(
    intention: IntentionDto,
    outcome: 'failure' | 'success' | 'unknown',
    reason: string | undefined,
    req: Request = undefined,
  ): Promise<boolean> {
    const endDate = new Date();
    const startDate = new Date(intention.transaction.start);
    intention.transaction.end = endDate.toISOString();
    intention.transaction.duration = endDate.valueOf() - startDate.valueOf();
    intention.transaction.outcome = outcome;

    this.auditService.recordIntentionClose(req, intention, reason);
    if (outcome === 'success') {
      this.intentionSync.sync(intention);
    }
    return this.intentionRepository.closeIntention(intention);
  }

  /**
   * Logs the start and end of an action
   * @param req The associated request object
   * @param token The intention action token
   * @param type Start or end of action
   * @returns Promise returning true if successfully logged and false otherwise
   */
  public async actionLifecycle(
    req: Request,
    intention: IntentionDto,
    action: ActionDto,
    outcome: string | undefined,
    type: 'start' | 'end',
  ): Promise<boolean> {
    if (!action) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Action not found',
      });
    }
    if (
      (type === 'start' &&
        (action.lifecycle === 'started' || action.lifecycle === 'ended')) ||
      (type === 'end' && action.lifecycle === 'ended')
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal lifecycle request',
        error: `Action's current lifecycle state (${action.lifecycle}) can not do transition: ${type}`,
      });
    }
    action = await this.intentionRepository.setIntentionActionLifecycle(
      action.trace.token,
      outcome,
      type,
    );
    this.auditService.recordIntentionActionLifecycle(
      req,
      intention,
      action,
      type,
    );
    return true;
  }

  /**
   * Renders the audit url for the intention passed in
   * @param intention The intention to create the audit url for
   * @returns The audit url string
   */
  public auditUrlForIntention(intention: IntentionDto): string {
    return ejs.render(this.AUDIT_URL_TEMPLATE, { intention });
  }

  /**
   * Creates a unique token and cooresponding hash of it.
   * @returns Object containing token and hash
   */
  private createTokenAndHash() {
    const token = uuidv4();
    const hasher = crypto.createHash('sha256');
    hasher.update(token);
    return {
      token,
      hash: hasher.digest('hex'),
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleIntentionExpiry() {
    if (!IS_PRIMARY_NODE) {
      // Nodes that are not the primary one should not do expiry
      return;
    }

    const expiredIntentionArr =
      await this.intentionRepository.findExpiredIntentions();
    for (const intention of expiredIntentionArr) {
      await this.finalizeIntention(intention, 'unknown', 'TTL expiry');
    }
  }

  private async getAccount(registryJwt: JwtRegistryDto) {
    if (!registryJwt) {
      return null;
    }
    return this.collectionRepository.getCollectionById(
      'brokerAccount',
      registryJwt.accountId.toString(),
    );
  }
}
