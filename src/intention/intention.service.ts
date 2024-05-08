import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { plainToInstance } from 'class-transformer';
import { ObjectId } from 'mongodb';
import { FindOptionsWhere } from 'typeorm';
import merge from 'lodash.merge';
import { validate } from 'class-validator';

import { IntentionDto } from './dto/intention.dto';
import {
  INTENTION_DEFAULT_TTL_SECONDS,
  INTENTION_MAX_TTL_SECONDS,
  INTENTION_MIN_TTL_SECONDS,
  INTENTION_TRANSIENT_TTL_MS,
  IS_PRIMARY_NODE,
  TOKEN_SERVICE_ALLOW_ORPHAN,
} from '../constants';
import { AuditService } from '../audit/audit.service';
import { ActionService } from './action.service';
import { ActionError } from './action.error';
import { BrokerJwtDto } from '../auth/broker-jwt.dto';
import { IntentionRepository } from '../persistence/interfaces/intention.repository';
import { IntentionSyncService } from '../graph/intention-sync.service';
import { ActionDto } from './dto/action.dto';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { JwtRegistryDto } from '../persistence/dto/jwt-registry.dto';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import {
  EnvironmentDtoMap,
  PersistenceUtilService,
} from '../persistence/persistence-util.service';
import { ServiceDto } from '../persistence/dto/service.dto';
import { ActionGuardRequest } from './action-guard-request.interface';
import { ArtifactDto } from './dto/artifact.dto';
import {
  ArtifactActionCombo,
  ArtifactSearchResult,
} from './dto/artifact-search-result.dto';
import { ArtifactSearchQuery } from './dto/artifact-search-query.dto';
import { ActionUtil, FindArtifactActionOptions } from '../util/action.util';
import { CollectionNameEnum } from '../persistence/dto/collection-dto-union.type';
import { BrokerAccountDto } from '../persistence/dto/broker-account.dto';
import { ActionPatchRestDto } from './dto/action-patch-rest.dto';
import { PackageDto } from './dto/package.dto';
import { CloudDto } from './dto/cloud.dto';
import { CloudObjectDto } from './dto/cloud-object.dto';

export interface IntentionOpenResponse {
  actions: {
    [key: string]: {
      token: string;
      trace_id: string;
      outcome: string;
    };
  };
  id: string;
  token: string;
  transaction_id: string;
  expiry: string;
}

type FindArtifactArtifactOptions = Partial<ArtifactDto>;

@Injectable()
export class IntentionService {
  constructor(
    private readonly auditService: AuditService,
    private readonly actionService: ActionService,
    private readonly actionUtil: ActionUtil,
    @Inject(forwardRef(() => IntentionSyncService))
    private readonly intentionSync: IntentionSyncService,
    private readonly graphRepository: GraphRepository,
    private readonly collectionRepository: CollectionRepository,
    private readonly intentionRepository: IntentionRepository,
    private readonly systemRepository: SystemRepository,
    private readonly persistenceUtilService: PersistenceUtilService,
  ) {}

  /**
   * Opens an intention after validating its details.
   * @param req The associated request object
   * @param intentionDto The intention dto to validate
   * @param ttl The requested time in seconds to live for this intention
   * @param dryRun Validate the intention without opening it
   * @returns The intention response or throws an error upon validation failure
   */
  public async open(
    req: Request,
    intentionDto: IntentionDto,
    ttl: number = INTENTION_DEFAULT_TTL_SECONDS,
    dryRun = false,
  ): Promise<IntentionOpenResponse> {
    const actions = {};
    const actionFailures: ActionError[] = [];
    const envMap = await this.persistenceUtilService.getEnvMap();

    // Only JWT "users" can make an open request
    const brokerJwt = plainToInstance(BrokerJwtDto, req.user);
    this.checkTimeToLiveBounds(ttl);

    // Annotate intention
    intentionDto.jwt = brokerJwt;
    intentionDto.requireRoleId = true;
    this.annotateIntentionTransaction(intentionDto, ttl);

    // Find JWT in registry
    const registryJwt =
      brokerJwt && brokerJwt.jti
        ? await this.systemRepository.getRegisteryJwtByClaimJti(brokerJwt.jti)
        : null;
    // Note: This check should never pass because of an earlier check of the
    // block list. This is a backup check.
    if (registryJwt && registryJwt.blocked) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Authorization failed',
        error: actionFailures,
      });
    }
    // Map JWT to Broker Account -- if possible
    const account = await this.getAccount(registryJwt);
    if (account) {
      this.annotateIntentionAccount(intentionDto, account);
    } else if (!TOKEN_SERVICE_ALLOW_ORPHAN) {
      actionFailures.push({
        message: 'Token must be bound to a broker account',
        data: {
          action: '',
          action_id: '',
          key: 'jwt.jti',
          value: intentionDto.jwt?.jti,
        },
      });
    }

    // Annotate all actions
    for (const action of intentionDto.actions) {
      this.annotateAction(intentionDto, action, envMap);
      await this.actionService.bindUserToAction(account, action);
      const service = await this.collectionRepository.getCollectionByKeyValue(
        'service',
        'name',
        action.service.name,
      );

      if (service) {
        // annotate with service id
        action.service.id = service.id;
        await this.annotateActionPackageFromExistingArtifact(action);
      }

      action.transaction = intentionDto.transaction;
      action.trace = this.createTokenAndHash();
    }

    const actionValidationErrors = await this.validateActions(
      intentionDto,
      account,
    );

    for (const [index, action] of intentionDto.actions.entries()) {
      const validationResult = actionValidationErrors[index];
      action.valid = validationResult === null;
      if (!action.valid) {
        actionFailures.push(validationResult);
      }
      actions[action.id] = {
        token: action.trace.token,
        trace_id: action.trace.hash,
        outcome: validationResult === null ? 'success' : 'failure',
      };
    }
    const isSuccessfulOpen = actionFailures.length === 0;
    const exception = !isSuccessfulOpen
      ? new BadRequestException({
          statusCode: 400,
          message: 'Authorization failed',
          error: actionFailures,
        })
      : null;

    if (!dryRun) {
      this.auditService.recordIntentionOpen(
        req,
        intentionDto,
        isSuccessfulOpen,
        exception,
      );
      this.auditService.recordActionAuthorization(
        req,
        intentionDto,
        actionFailures,
      );
    }
    if (!isSuccessfulOpen) {
      throw exception;
    }
    if (!dryRun) {
      await this.intentionRepository.addIntention(intentionDto);
    }
    return {
      actions,
      id: intentionDto.id.toString(),
      token: intentionDto.transaction.token,
      transaction_id: intentionDto.transaction.hash,
      expiry: new Date(intentionDto.expiry).toUTCString(),
    };
  }

  /**
   * Quick start an intention with a single action
   * @param req The associated request object
   * @param openResp The intention open response to quick start
   */
  public async quickStart(req: Request, openResp: IntentionOpenResponse) {
    if (openResp.actions && Object.keys(openResp.actions).length !== 1) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Quick start failure',
        error: ` Quick start intentions must have 1 action`,
      });
    }
    const intention = await this.intentionRepository.getIntentionByToken(
      openResp.token,
    );
    if (
      !(await this.actionLifecycle(
        req,
        intention,
        intention.actions[0],
        undefined,
        'start',
      ))
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Quick start failure',
        error: ` Quick start could not start action`,
      });
    }
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
      const intentions = await this.intentionRepository.searchIntentions(
        JSON.parse(whereClause),
        offset,
        limit,
      );
      for (const intention of intentions.data) {
        intention.auditUrl = this.actionUtil.auditUrlForIntention(intention);
      }
      return intentions;
    } catch (e) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal search arguement',
        error: `Check parameters for errors`,
      });
    }
  }

  public async getIntention(id: string) {
    const intention = await this.intentionRepository.getIntention(id);
    if (intention) {
      intention.auditUrl = this.actionUtil.auditUrlForIntention(intention);
    }
    return intention;
  }

  public async artifactSearchByQuery(
    query: ArtifactSearchQuery,
  ): Promise<ArtifactSearchResult> {
    try {
      // must await to catch error
      const result = await this.intentionRepository.searchIntentions(
        {
          'actions.artifacts': { $exists: true },
          ...(query.intention ? { _id: new ObjectId(query.intention) } : {}),
          ...(query.service ? { 'actions.service.name': query.service } : {}),
          ...(query.serviceId
            ? { 'actions.service.id': new ObjectId(query.serviceId) }
            : {}),
          ...(query.traceHash ? { 'actions.trace.hash': query.traceHash } : {}),
          ...(query.checksum
            ? { 'actions.artifacts.checksum': query.checksum }
            : {}),
          ...(query.name ? { 'actions.artifacts.name': query.name } : {}),
          ...(query.type ? { 'actions.artifacts.type': query.type } : {}),
          ...(query.version
            ? { 'actions.package.version': query.version }
            : {}),
          ...(query.outcome
            ? { 'transaction.outcome': query.outcome }
            : { 'transaction.outcome': 'success' }),
        } as FindOptionsWhere<IntentionDto>,
        query.offset,
        query.limit,
      );
      return {
        ...result,
        data: result.data
          .map((intention) => {
            return this.findArtifacts(
              intention,
              this.actionUtil.actionToOptions(query.action),
              {
                checksum: query.checksum,
                name: query.name,
                type: query.type,
              },
            );
          })
          .reduce((pv, cv) => pv.concat(cv), []),
      };
    } catch (e) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal search arguement',
        error: `Check parameters for errors`,
      });
    }
  }

  private findArtifacts(
    intention: IntentionDto | null,
    actionOptions: FindArtifactActionOptions,
    artifactOptions: FindArtifactArtifactOptions,
  ): ArtifactActionCombo[] {
    for (const action of this.actionUtil.filterActions(
      intention.actions,
      actionOptions,
    )) {
      if (!action.artifacts) {
        return;
      }
      const artifacts = action.artifacts.filter((artifact) => {
        return Object.entries(artifactOptions).every(
          ([k, v]) => !v || artifact[k] === v,
        );
      });
      return artifacts.map((artifact) => ({ action, artifact, intention }));
    }
  }

  private async annotateActionPackageFromExistingArtifact(action: ActionDto) {
    if (action.action !== 'package-installation' || !action.service.id) {
      // Only annotates package installations
      // Only existing services (with service.id set) will have artifacts
      return;
    }
    let artifactSearchResult: ArtifactSearchResult;

    if (action.source && action.source.intention) {
      // Get using source -- preferred method
      artifactSearchResult = await this.artifactSearchByQuery({
        intention: action.source.intention.toString(),
        action: action.source.action,
        checksum: action.package?.checksum,
        name: action.package?.name,
        type: action.package?.type,
        version: action.package?.version,
        serviceId: action.service.id?.toString(),
        service: action.service.name,
        offset: 0,
        limit: 1,
      });

      if (
        artifactSearchResult.meta.total !== 1 &&
        artifactSearchResult.data.length !== 1
      ) {
        // Skip: Could not uniquely identify artifact based on source
        return;
      }
    } else if (action.package?.name && action.package?.version) {
      artifactSearchResult = await this.artifactSearchByQuery({
        action: action.source?.action,
        checksum: action.package?.checksum,
        name: action.package?.name,
        type: action.package?.type,
        version: action.package?.version,
        serviceId: action.service.id?.toString(),
        service: action.service.name,
        offset: 0,
        limit: 1,
      });
    } else {
      return;
    }

    if (artifactSearchResult.meta.total === 0) {
      // Could not identify artifact
      return;
    }

    action.package = {
      ...(artifactSearchResult.data[0].action.package ?? {}),
      ...artifactSearchResult.data[0].artifact,
      ...action.package,
    };
    action.source.action = this.actionUtil.actionToIdString(
      artifactSearchResult.data[0].action,
    );
  }

  private async finalizeIntention(
    intention: IntentionDto,
    outcome: 'failure' | 'success' | 'unknown',
    reason: string | undefined,
    req: Request = undefined,
  ): Promise<boolean> {
    const startDate = new Date(intention.transaction.start);
    for (const action of intention.actions) {
      if (action.lifecycle === 'started') {
        await this.actionLifecycle(req, intention, action, outcome, 'end');
        intention = await this.intentionRepository.getIntention(intention.id);
      }
    }

    for (const action of intention.actions) {
      if (
        outcome === 'success' &&
        action.trace?.outcome === 'success' &&
        action.action === 'package-build' &&
        action.package &&
        action.package.name
      ) {
        // Register build as an artifact
        await this.actionArtifactRegister(
          req,
          intention,
          action,
          {
            name: action.package.name,
            ...(action.package.checksum
              ? { checksum: action.package.checksum }
              : {}),
            ...(action.package.size ? { size: action.package.size } : {}),
            ...(action.package.type ? { type: action.package.type } : {}),
          },
          true,
        );
        intention = await this.intentionRepository.getIntention(intention.id);
      }
    }

    // Must measure time after ending all actions
    const endDate = new Date();
    intention.transaction.end = endDate.toISOString();
    intention.transaction.duration = endDate.valueOf() - startDate.valueOf();
    intention.transaction.outcome = outcome;

    this.auditService.recordIntentionClose(req, intention, reason);
    if (outcome === 'success') {
      await this.intentionSync.sync(intention);
    }
    for (const action of intention.actions) {
      if (!action.service.id) {
        const colObj = await this.collectionRepository.getCollectionByKeyValue(
          'service',
          'name',
          action.service.name,
        );
        if (colObj) {
          action.service.id = colObj.id;
        }
      }
    }
    return this.intentionRepository.closeIntention(intention);
  }

  /**
   * Logs the start and end of an action
   * @param req The associated request object
   * @param intention The intention to start the action for
   * @param action The action to log the lifecycle for
   * @param outcome The outcome of the action
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
   * Registers an artifact with an action
   * @param req The associated request object
   * @param intention The intention containing the action
   * @param action The action to register the artifact with
   * @param artifact The artifact to register
   */
  public async actionArtifactRegister(
    req: ActionGuardRequest,
    intention: IntentionDto,
    action: ActionDto,
    artifact: ArtifactDto,
    ignoreLifecycle = false,
  ) {
    if (!ignoreLifecycle && action.lifecycle !== 'started') {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal artifact register',
        error: `Action's current lifecycle state (${action.lifecycle}) can not register artifacts`,
      });
    }
    this.auditService.recordIntentionActionUsage(
      req,
      intention,
      action,
      {
        event: {
          action: 'artifact-register',
          category: 'configuration',
          type: 'creation',
        },
      },
      null,
      artifact,
    );
    await this.intentionRepository.addIntentionActionArtifact(
      action.trace.token,
      artifact,
    );
    return action.package?.buildGuid;
  }

  /**
   * Patches valid action with additional information
   * @param req The associated request object
   * @param intention The intention containing the action
   * @param action The action to patch
   * @param patchAction The patch
   */
  public async patchAction(
    req: ActionGuardRequest,
    intention: IntentionDto,
    action: ActionDto,
    patchAction: ActionPatchRestDto,
  ) {
    if (action.lifecycle !== 'started') {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal artifact register',
        error: `Action's current lifecycle state (${action.lifecycle}) does not allow patching actions`,
      });
    }

    // Patch according to action
    if (action.action === 'package-build') {
      if (patchAction?.package) {
        action.package = plainToInstance(PackageDto, {
          ...(action.package ?? {}),
          ...patchAction.package,
        });
      } else {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Nothing to patch',
          error: 'Must include json body to patch',
        });
      }
    } else if (action.action === 'package-installation') {
      if (patchAction?.cloud?.target) {
        if (!action?.cloud) {
          action.cloud = plainToInstance(CloudDto, { target: {} });
        }
        if (!action?.cloud.target) {
          action.cloud.target = plainToInstance(CloudObjectDto, {});
        }
        merge(action.cloud.target, patchAction.cloud.target);
      } else {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Nothing to patch',
          error: 'Must include json body to patch',
        });
      }
    }

    const errors = await validate(action, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed');
    }
    const account = intention.accountId
      ? await this.collectionRepository.getCollectionById(
          'brokerAccount',
          intention.accountId.toString(),
        )
      : null;

    // replace with patched action
    intention.actions = intention.actions.map((currentAction) =>
      currentAction.id === action.id ? action : currentAction,
    );
    const actionValidationErrors = await this.validateActions(
      intention,
      account,
    );
    const actionFailures = actionValidationErrors.filter(
      (validationError) => validationError !== null,
    );
    if (actionFailures.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Authorization failed',
        error: actionFailures,
      });
    }

    this.auditService.recordIntentionActionUsage(
      req,
      intention,
      action,
      {
        event: {
          action: 'package-annotate',
          category: 'configuration',
          type: 'change',
        },
      },
      null,
      null,
    );
    return await this.intentionRepository.addIntention(intention);
  }

  private checkTimeToLiveBounds(ttl: number) {
    if (ttl < INTENTION_MIN_TTL_SECONDS || ttl > INTENTION_MAX_TTL_SECONDS) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'TTL out of bounds',
        error: `TTL must be between ${INTENTION_MIN_TTL_SECONDS} and ${INTENTION_MAX_TTL_SECONDS}`,
      });
    }
  }

  private annotateIntentionTransaction(
    intentionDto: IntentionDto,
    ttl: number,
  ) {
    const startDate = new Date();
    intentionDto.transaction = {
      ...this.createTokenAndHash(),
      start: startDate.toISOString(),
    };
    intentionDto.expiry = startDate.valueOf() + ttl * 1000;
  }

  private annotateIntentionAccount(
    intentionDto: IntentionDto,
    account: BrokerAccountDto,
  ) {
    intentionDto.accountId = account.id;
    intentionDto.requireRoleId = account.requireRoleId;
  }

  private annotateAction(
    intentionDto: IntentionDto,
    action: ActionDto,
    envMap: EnvironmentDtoMap,
  ) {
    const env = this.actionUtil.environmentName(action);
    const envDto = envMap[env];
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
    if (!action.user) {
      action.user = intentionDto.user;
    }
  }

  private async validateActions(
    intentionDto: IntentionDto,
    account: BrokerAccountDto | null,
  ): Promise<ActionError[]> {
    let targetServices = [];
    const validationResult: ActionError[] = [];

    const accountBoundProjects = account
      ? await this.graphRepository.getBrokerAccountServices(
          account.vertex.toString(),
        )
      : null;

    for (const action of intentionDto.actions) {
      const service = action.service.id
        ? await this.collectionRepository.getCollectionById(
            'service',
            action.service.id.toString(),
          )
        : null;

      if (service) {
        if (action.service.target) {
          const targetSearch =
            await this.graphRepository.getDownstreamVertex<ServiceDto>(
              service.vertex.toString(),
              CollectionNameEnum.service,
              1,
            );

          targetServices = targetSearch.map((t) => t.collection.name);
        }
      }

      validationResult.push(
        await this.actionService.validate(
          intentionDto,
          action,
          account,
          accountBoundProjects,
          targetServices,
          account ? !!account?.requireProjectExists : true,
          account ? !!account?.requireServiceExists : true,
        ),
      );
    }
    return validationResult;
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

  @Cron(CronExpression.EVERY_HOUR)
  async handleTransientCleanup() {
    if (!IS_PRIMARY_NODE) {
      // Nodes that are not the primary one should not do cleanup
      return;
    }
    await this.intentionRepository.cleanupTransient(INTENTION_TRANSIENT_TTL_MS);
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
