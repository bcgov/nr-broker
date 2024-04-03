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
import { ObjectId } from 'mongodb';
import { FindOptionsWhere } from 'typeorm';
import ejs from 'ejs';
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
import { BrokerAccountProjectMapDto } from '../persistence/dto/graph-data.dto';
import { PersistenceUtilService } from '../persistence/persistence-util.service';
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
import { InstallDto } from './dto/install.dto';

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
  private readonly AUDIT_URL_TEMPLATE = process.env.AUDIT_URL_TEMPLATE
    ? process.env.AUDIT_URL_TEMPLATE
    : '';

  constructor(
    private readonly auditService: AuditService,
    private readonly actionService: ActionService,
    private readonly actionUtil: ActionUtil,
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
    const startDate = new Date();
    const actions = {};
    const actionFailures: ActionError[] = [];
    const envMap = await this.persistenceUtilService.getEnvMap();
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
    } else if (!TOKEN_SERVICE_ALLOW_ORPHAN) {
      actionFailures.push({
        message: 'Token must be bound to a broker account',
        data: {
          action: '',
          action_id: '',
          key: 'jwt.jti',
          value: intentionDto.jwt.jti,
        },
      });
    }

    for (const action of intentionDto.actions) {
      const env = action.service.target
        ? action.service.target.environment
        : action.service.environment;
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
      await this.actionService.bindUserToAction(account, action);
      let targetServices = [];
      const colObj = await this.collectionRepository.getCollectionByKeyValue(
        'service',
        'name',
        action.service.name,
      );

      if (colObj) {
        action.service.id = colObj.id;
        if (action.service.target) {
          const targetSearch =
            await this.graphRepository.getDownstreamVertex<ServiceDto>(
              colObj.vertex.toString(),
              CollectionNameEnum.service,
              1,
            );

          targetServices = targetSearch.map((t) => t.collection.name);
        }
      }
      await this.annotateAction(action);
      const validationResult = await this.actionService.validate(
        intentionDto,
        action,
        account,
        accountBoundProjects,
        targetServices,
        account ? !!account?.requireProjectExists : true,
        account ? !!account?.requireServiceExists : true,
      );
      action.valid = validationResult === null;
      if (!action.valid) {
        actionFailures.push(validationResult);
      }
      action.transaction = intentionDto.transaction;
      action.trace = this.createTokenAndHash();
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
        intention.auditUrl = this.auditUrlForIntention(intention);
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
      intention.auditUrl = this.auditUrlForIntention(intention);
    }
    return intention;
  }

  public async artifactSearchByQuery(
    query: ArtifactSearchQuery,
  ): Promise<ArtifactSearchResult> {
    try {
      // must await to catch error
      const result = await this.artifactSearch(
        query.intention,
        query.action,
        query.traceHash,
        query.checksum,
        query.name,
        query.type,
        query.serviceId,
        query.service,
        query.offset,
        query.limit,
      );
      return result;
    } catch (e) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal search arguement',
        error: `Check parameters for errors`,
      });
    }
  }

  public async artifactSearch(
    intention: string | null,
    action: string | null,
    traceHash: string | null,
    checksum: string | null,
    name: string | null,
    type: string | null,
    serviceId: string | null,
    service: string | null,
    offset: number,
    limit: number,
  ): Promise<ArtifactSearchResult> {
    const result = await this.intentionRepository.searchIntentions(
      {
        'actions.artifacts': { $exists: true },
        ...(intention ? { _id: new ObjectId(intention) } : {}),
        ...(service ? { 'actions.service.name': service } : {}),
        ...(serviceId ? { 'actions.service.id': new ObjectId(serviceId) } : {}),
        ...(traceHash ? { 'actions.trace.hash': traceHash } : {}),
        ...(checksum ? { 'actions.artifacts.checksum': checksum } : {}),
        ...(name ? { 'actions.artifacts.name': name } : {}),
        ...(type ? { 'actions.artifacts.type': type } : {}),
      } as FindOptionsWhere<IntentionDto>,
      offset,
      limit,
    );

    return {
      ...result,
      data: result.data
        .map((intention) => {
          return this.findArtifacts(
            intention,
            this.actionUtil.actionToOptions(action),
            {
              checksum: checksum,
              name: name,
              type: type,
            },
          );
        })
        .reduce((pv, cv) => pv.concat(cv), []),
    };
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

  private async annotateAction(action: ActionDto) {
    if (action.action === 'package-installation' && action.source) {
      const foundArtifact = await this.artifactSearch(
        action.source.intention.toString(),
        action.source.action,
        null,
        action.package.checksum,
        action.package.name,
        action.package.type,
        action.service.id?.toString(),
        action.service.name,
        0,
        1,
      );
      if (foundArtifact.meta.total !== 1 && foundArtifact.data.length !== 1) {
        // Skip: Could not uniquely identify artifact based on package
        return;
      }

      action.package = {
        ...(foundArtifact.data[0].action.package ?? {}),
        ...foundArtifact.data[0].artifact,
        ...action.package,
      };
      action.source.action = `${foundArtifact.data[0].action.action}#${foundArtifact.data[0].action.id}`;
    }
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
  ) {
    if (action.lifecycle !== 'started') {
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
   * Registers an install with an action
   * @param req The associated request object
   * @param intention The intention containing the action
   * @param action The action to register the artifact with
   * @param install The install to register
   */
  public async actionInstallRegister(
    req: ActionGuardRequest,
    intention: IntentionDto,
    action: ActionDto,
    install: InstallDto,
  ) {
    const instanceName = this.actionUtil.instanceName(action);
    if (action.lifecycle !== 'started') {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal install register',
        error: `Action's current lifecycle state (${action.lifecycle}) can not register artifacts`,
      });
    }
    const serverVertex = await this.graphRepository.getVertexByName(
      'server',
      install.cloudTarget.instance.name,
    );
    if (!serverVertex) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal install register',
        error: `Server not found`,
      });
    }

    const serviceVertex = await this.graphRepository.getVertexByName(
      'service',
      action.service.name,
    );

    await this.intentionSync.syncPackageInstall(
      intention,
      action,
      serviceVertex,
    );

    const instanceVertex =
      await this.graphRepository.getVertexByParentIdAndName(
        'serviceInstance',
        serviceVertex.id.toString(),
        instanceName,
      );
    // console.log(instanceVertex);
    // console.log(serverVertex);

    await this.intentionSync.overlayEdge(
      'installation',
      instanceVertex,
      serverVertex,
      'merge',
      install.prop,
    );

    this.auditService.recordIntentionActionUsage(
      req,
      intention,
      action,
      {
        event: {
          action: 'install-register',
          category: 'configuration',
          type: 'creation',
        },
      },
      null,
      undefined,
    );

    // await this.intentionRepository.addIntentionActionInstall(
    //   action.trace.token,
    //   install,
    // );
    // console.log(install);
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
