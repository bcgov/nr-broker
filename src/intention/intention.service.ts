import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Request } from 'express';
import { Cron, CronExpression } from '@nestjs/schedule';
import { instanceToPlain } from 'class-transformer';
import { ObjectId } from 'mongodb';
import merge from 'lodash.merge';
import { validate } from 'class-validator';

import { IntentionEntity } from './entity/intention.entity';
import {
  INTENTION_DEFAULT_TTL_SECONDS,
  INTENTION_MAX_TTL_SECONDS,
  INTENTION_MIN_TTL_SECONDS,
  INTENTION_TRANSIENT_TTL_MS,
  IS_PRIMARY_NODE,
} from '../constants';
import { AuditService } from '../audit/audit.service';
import { ActionService } from './action.service';
import { ActionError } from './action.error';
import { BrokerJwtEmbeddable } from '../auth/broker-jwt.embeddable';
import { IntentionRepository } from '../persistence/interfaces/intention.repository';
import { IntentionSyncService } from '../graph/intention-sync.service';
import { ActionDto } from './dto/action.dto';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { JwtRegistryEntity } from '../persistence/entity/jwt-registry.entity';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import {
  EnvironmentEntityMap,
  PersistenceUtilService,
} from '../persistence/persistence-util.service';
import { ActionGuardRequest } from './action-guard-request.interface';
import { ArtifactDto } from './dto/artifact.dto';
import {
  ArtifactActionCombo,
  ArtifactSearchResult,
} from './dto/artifact-search-result.dto';
import { ArtifactSearchQuery } from './dto/artifact-search-query.dto';
import { ActionUtil, FindArtifactActionOptions } from '../util/action.util';
import { CollectionNameEnum } from '../persistence/dto/collection-dto-union.type';
import { BrokerAccountEntity } from '../persistence/entity/broker-account.entity';
import { ActionPatchRestDto } from './dto/action-patch-rest.dto';
import { CreateRequestContext } from '@mikro-orm/core';
import { IntentionDto } from './dto/intention.dto';
import { IntentionUtilService } from './intention-util.service';
import { TransactionEmbeddable } from './entity/transaction.embeddable';
import { EventEmbeddable } from './entity/event.embeddable';
import {
  ActionEmbeddable,
  ENVIRONMENT_NAMES,
} from './entity/action.embeddable';
import { BackupActionEmbeddable } from './entity/backup.action.embeddable';
import { PackageInstallationActionEmbeddable } from './entity/package-installation-action.embeddable';
import { IntentionServiceEmbeddable } from './entity/intention-service.embeddable';
import { DatabaseAccessActionEmbeddable } from './entity/database-access-action.embeddable';
import { PackageBuildActionEmbeddable } from './entity/package-build-action.embeddable';
import { PackageConfigureActionEmbeddable } from './entity/package-configure-action.embeddable';
import { PackageProvisionActionEmbeddable } from './entity/package-provision-action.embeddable';
import { ProcessEndActionEmbeddable } from './entity/process-end-action.embeddable';
import { ProcessStartActionEmbeddable } from './entity/process-start-action.embeddable';
import { ServerAccessActionEmbeddable } from './entity/server-access-action.embeddable';
import { PackageEmbeddable } from './entity/package.embeddable';
import { ServiceDto } from '../persistence/dto/service.dto';

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
    private readonly intentionUtilService: IntentionUtilService,
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
    const actionResults = {};
    const actionFailures: ActionError[] = [];
    const envMap = await this.persistenceUtilService.getEnvMap();

    // Only JWT "users" can make an open request
    const brokerJwt = BrokerJwtEmbeddable.fromUser(req.user);
    if (brokerJwt === null) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'No valid JWT user info',
      });
    }
    this.checkTimeToLiveBounds(ttl);

    const transaction = this.createIntentionTransaction(ttl);

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
      });
    }
    // Map JWT to Broker Account
    const account = await this.getAccountFromRegistry(registryJwt);
    if (!account) {
      actionFailures.push({
        message: 'Token must be bound to a broker account',
        data: {
          action: '',
          action_id: '',
          key: 'jwt.jti',
          value: brokerJwt.jti,
        },
      });
    }

    const intentionUser = await this.intentionUtilService.convertUserDtoToEmbed(
      intentionDto.user,
      account,
    );

    // Convert all actions
    const actions: (
      | BackupActionEmbeddable
      | DatabaseAccessActionEmbeddable
      | ServerAccessActionEmbeddable
      | PackageBuildActionEmbeddable
      | PackageConfigureActionEmbeddable
      | PackageInstallationActionEmbeddable
      | PackageProvisionActionEmbeddable
      | ProcessEndActionEmbeddable
      | ProcessStartActionEmbeddable
    )[] = await Promise.all(
      intentionDto.actions.map(async (action) => {
        const actionUser = action.user
          ? await this.intentionUtilService.convertUserDtoToEmbed(
              action.user,
              account,
            )
          : intentionUser;
        const service = await this.collectionRepository.getCollectionByKeyValue(
          'service',
          'name',
          action.service.name,
        );
        const serviceEmbed = IntentionServiceEmbeddable.fromDto(action.service);
        if (service) {
          serviceEmbed.id = service._id;
        }
        const trace = TransactionEmbeddable.create();
        const vaultEnvironment =
          ENVIRONMENT_NAMES[this.computeVaultEnvironment(action, envMap)];

        switch (action.action) {
          case 'backup':
            return new BackupActionEmbeddable(
              action,
              actionUser,
              serviceEmbed,
              vaultEnvironment,
              trace,
            );
          case 'database-access':
            return new DatabaseAccessActionEmbeddable(
              action,
              actionUser,
              serviceEmbed,
              vaultEnvironment,
              trace,
            );
          case 'package-build':
            return new PackageBuildActionEmbeddable(
              action,
              actionUser,
              serviceEmbed,
              vaultEnvironment,
              trace,
            );
          case 'package-configure':
            return new PackageConfigureActionEmbeddable(
              action,
              actionUser,
              serviceEmbed,
              vaultEnvironment,
              trace,
            );
          case 'package-installation':
            return new PackageInstallationActionEmbeddable(
              action,
              actionUser,
              serviceEmbed,
              vaultEnvironment,
              trace,
              PackageEmbeddable.fromDto(action.package),
            );
          case 'package-provision':
            return new PackageProvisionActionEmbeddable(
              action,
              actionUser,
              serviceEmbed,
              vaultEnvironment,
              trace,
            );
          case 'process-end':
            return new ProcessEndActionEmbeddable(
              action,
              actionUser,
              serviceEmbed,
              vaultEnvironment,
              trace,
            );
          case 'process-start':
            return new ProcessStartActionEmbeddable(
              action,
              actionUser,
              serviceEmbed,
              vaultEnvironment,
              trace,
            );
          case 'server-access':
            return new ServerAccessActionEmbeddable(
              action,
              actionUser,
              serviceEmbed,
              vaultEnvironment,
              trace,
            );
          default:
            // If this is an error then not all collection types are above
            // eslint-disable-next-line no-case-declarations
            const _exhaustiveCheck: never = action.action;
            return _exhaustiveCheck;
        }
      }),
    );

    const intention = new IntentionEntity(
      actions,
      EventEmbeddable.fromDto(intentionDto.event),
      brokerJwt,
      intentionUser,
      transaction.transaction,
      transaction.expiry,
      account,
    );

    const actionValidationErrors = await this.validateActions(
      intention,
      account,
    );

    for (const [index, action] of intention.actions.entries()) {
      const validationResult = actionValidationErrors[index];
      action.valid = validationResult === null;
      if (!action.valid) {
        actionFailures.push(validationResult);
      }
      actionResults[action.id] = {
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
        intention,
        isSuccessfulOpen,
        exception,
      );
      this.auditService.recordActionAuthorization(
        req,
        intention,
        actionFailures,
      );
    }
    if (!isSuccessfulOpen) {
      throw exception;
    }
    if (!dryRun) {
      await this.intentionRepository.addIntention(intention);
    }
    return {
      actions: actionResults,
      id: intention.id,
      token: intention.transaction.token,
      transaction_id: intention.transaction.hash,
      expiry: new Date(intention.expiry).toUTCString(),
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
  ): Promise<IntentionEntity> {
    const intention: IntentionEntity =
      await this.intentionRepository.getIntentionByToken(token);
    console.log(token);
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
        } as any, // as FindOptionsWhere<IntentionEntity>,
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
    intention: IntentionEntity | null,
    actionOptions: FindArtifactActionOptions,
    artifactOptions: FindArtifactArtifactOptions,
  ): ArtifactActionCombo[] {
    // TODO: fix ArtifactActionCombo[]
    const artifactCombos: any[] = [];
    for (const action of this.actionUtil.filterActions(
      intention.actions,
      actionOptions,
    )) {
      if (!action.artifacts) {
        continue;
      }
      const artifacts = action.artifacts.filter((artifact) => {
        return Object.entries(artifactOptions).every(
          ([k, v]) => !v || artifact[k] === v,
        );
      });

      artifactCombos.push(
        ...artifacts.map((artifact) => ({ action, artifact, intention })),
      );
    }
    return artifactCombos;
  }

  private async annotateActionPackageFromExistingArtifact(
    action: ActionEmbeddable,
  ) {
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
      // Find latest artifact for this service with same package name and version
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

    action.package = PackageEmbeddable.merge(
      artifactSearchResult.data[0].action.package ?? {},
      artifactSearchResult.data[0].artifact,
      action.package,
    );
    if (!action.source) {
      action.source = {
        intention: new ObjectId(
          artifactSearchResult.data[0].intention.id.toString(),
        ),
      };
    }
    // action.source.action = this.actionUtil.actionToIdString(
    //   artifactSearchResult.data[0].action,
    // );
  }

  private async finalizeIntention(
    intention: IntentionEntity,
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
      // All open intention have link to account
      const account = await this.getAccount(intention.accountId?.toString());
      await this.intentionSync.sync(intention, account);
    }
    for (const action of intention.actions) {
      if (!action.service.id) {
        const colObj = await this.collectionRepository.getCollectionByKeyValue(
          'service',
          'name',
          action.service.name,
        );
        if (colObj) {
          action.service.id = colObj._id;
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
    intention: IntentionEntity,
    action: ActionEmbeddable,
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
    intention: IntentionEntity,
    action: ActionEmbeddable,
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
    if (
      action.artifacts &&
      action.artifacts.filter((value) => value.name === artifact.name).length >
        0
    ) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Illegal artifact register',
        error: `Artifact '${artifact.name}' already exists`,
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
    intention: IntentionEntity,
    action: ActionEmbeddable,
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
        action.package = PackageEmbeddable.merge(
          action.package ?? {},
          patchAction.package,
        );
      } else {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Nothing to patch',
          error: 'Must include json body to patch',
        });
      }
    } else if (action.action === 'package-installation') {
      if (patchAction?.cloud?.target) {
        // if (!action?.cloud) {
        //   action.cloud = CloudObjectEmbeddable;
        // }
        // if (!action?.cloud.target) {
        //   action.cloud.target = plainToInstance(CloudObjectDto, {});
        // }
        // Convert to plain for merge
        const target = instanceToPlain(action.cloud.target);
        const source = instanceToPlain(patchAction.cloud.target);
        merge(target, source);
        // Convert to type after merge
        // action.cloud.target = plainToInstance(CloudObjectDto, target);
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

  private createIntentionTransaction(ttl: number) {
    const startDate = new Date();
    const transaction = TransactionEmbeddable.create();
    const expiry = startDate.valueOf() + ttl * 1000;

    return {
      transaction,
      expiry,
    };
  }

  private computeVaultEnvironment(
    action: ActionEmbeddable | ActionDto,
    envMap: EnvironmentEntityMap,
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
      return envDto.name;
    }
    return action.vaultEnvironment;
  }

  private async validateActions(
    intentionDto: IntentionEntity,
    account: BrokerAccountEntity | null,
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

  @CreateRequestContext()
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

  @CreateRequestContext()
  @Cron(CronExpression.EVERY_HOUR)
  async handleTransientCleanup() {
    if (!IS_PRIMARY_NODE) {
      // Nodes that are not the primary one should not do cleanup
      return;
    }
    await this.intentionRepository.cleanupTransient(INTENTION_TRANSIENT_TTL_MS);
  }

  private async getAccountFromRegistry(registryJwt: JwtRegistryEntity) {
    if (!registryJwt) {
      return null;
    }
    return this.collectionRepository.getCollectionById(
      'brokerAccount',
      registryJwt.accountId.toString(),
    );
  }

  private async getAccount(accountId: string) {
    if (!accountId) {
      return null;
    }
    return this.collectionRepository.getCollectionById(
      'brokerAccount',
      accountId,
    );
  }
}
