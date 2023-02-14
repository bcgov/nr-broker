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
import { PersistenceService } from '../persistence/persistence.service';
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

export interface IntentionOpenResponse {
  actions: any;
  token: string;
  transaction_id: string;
  expiry: string;
}

@Injectable()
export class IntentionService {
  constructor(
    private readonly auditService: AuditService,
    private readonly actionService: ActionService,
    private readonly persistenceService: PersistenceService,
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
    for (const action of intentionDto.actions) {
      const validationResult = this.actionService.validate(
        intentionDto,
        action,
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
    await this.persistenceService.addIntention(intentionDto);
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
  ): Promise<boolean> {
    const intention: IntentionDto =
      await this.persistenceService.getIntentionByToken(token);
    if (!intention) {
      throw new NotFoundException();
    }
    return this.finalizeIntention(intention, outcome, reason, req);
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
    return this.persistenceService.closeIntention(intention);
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
    actionToken: string,
    outcome: string | undefined,
    type: 'start' | 'end',
  ): Promise<boolean> {
    let action = await this.persistenceService.getIntentionActionByToken(
      actionToken,
    );
    if (!action) {
      throw new NotFoundException();
    }
    if (
      (type === 'start' &&
        (action.lifecycle === 'started' || action.lifecycle === 'ended')) ||
      (type === 'end' && action.lifecycle === 'ended')
    ) {
      throw new BadRequestException();
    }
    action = await this.persistenceService.setIntentionActionLifecycle(
      actionToken,
      outcome,
      type,
    );
    this.auditService.recordIntentionActionLifecycle(req, action, type);
    return true;
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
      await this.persistenceService.findExpiredIntentions();
    for (const intention of expiredIntentionArr) {
      await this.finalizeIntention(intention, 'unknown', 'TTL expiry');
    }
  }
}
