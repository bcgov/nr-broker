import { beforeEach, describe, it, expect, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { IntentionService } from './intention.service';
import { AuditService } from '../audit/audit.service';
import { ActionService } from './action.service';
import { ActionUtil } from '../util/action.util';
import { CommunicationQueueService } from '../communication/communication-queue.service';
import { IntentionSyncService } from '../graph/intention-sync.service';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { IntentionRepository } from '../persistence/interfaces/intention.repository';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { PersistenceUtilService } from '../persistence/persistence-util.service';
import { IntentionUtilService } from './intention-util.service';
import { ValidatorUtil } from '../util/validator.util';
import { IntentionValidationRuleEngine } from './validation/intention-validation-rule.engine';
import { MikroORM } from '@mikro-orm/mongodb';
import { BadRequestException } from '@nestjs/common';
import { IntentionDto } from './dto/intention.dto';

describe('IntentionService', () => {
  let service: IntentionService;
  let auditService: AuditService;
  let actionService: ActionService;
  let actionUtil: ActionUtil;
  let collectionRepository: CollectionRepository;
  let intentionRepository: IntentionRepository;
  let intentionValidationRuleEngine: IntentionValidationRuleEngine;

  function validJwtUser() {
    const now = Math.floor(Date.now() / 1000);
    return {
      client_id: 'client-id',
      exp: now + 3600,
      iat: now,
      nbf: now,
      jti: 'jti-1',
      sub: 'sub-1',
    } as any;
  }

  beforeEach(async () => {
    auditService = {
      recordIntentionOpen: vi.fn(),
      recordActionAuthorization: vi.fn(),
    } as unknown as AuditService;
    actionService = {
      validate: vi.fn(),
    } as unknown as ActionService;
    actionUtil = new ActionUtil();
    const communicationQueueService = {
      send: vi.fn(),
    } as unknown as CommunicationQueueService;
    const intentionSync = {
      sync: vi.fn(),
    } as unknown as IntentionSyncService;
    collectionRepository = {
      getCollectionByKeyValue: vi.fn(),
    } as unknown as CollectionRepository;
    intentionRepository = {
      addIntention: vi.fn(),
    } as unknown as IntentionRepository;
    const systemRepository = {
      getRegisteryJwtByClaimJti: vi.fn(),
    } as unknown as SystemRepository;
    const persistenceUtilService = {
      getEnvMap: vi.fn(),
    } as unknown as PersistenceUtilService;
    const intentionUtilService = {
      convertUserDtoToEmbed: vi.fn(),
    } as unknown as IntentionUtilService;
    const validatorUtil = {
      validate: vi.fn(),
    } as unknown as ValidatorUtil;
    const graphRepository = {
      getUpstreamVertex: vi.fn(),
      getServiceDetails: vi.fn(),
    } as unknown as GraphRepository;
    intentionValidationRuleEngine = {
      validate: vi.fn(),
      getRules: vi.fn(),
    } as unknown as IntentionValidationRuleEngine;
    const orm = {
      getConnection: vi.fn(() => ({ connect: vi.fn() })),
    } as unknown as MikroORM;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntentionService,
        { provide: AuditService, useValue: auditService },
        { provide: ActionService, useValue: actionService },
        { provide: ActionUtil, useValue: actionUtil },
        { provide: CommunicationQueueService, useValue: communicationQueueService },
        { provide: IntentionSyncService, useValue: intentionSync },
        { provide: GraphRepository, useValue: graphRepository },
        { provide: CollectionRepository, useValue: collectionRepository },
        { provide: IntentionRepository, useValue: intentionRepository },
        { provide: SystemRepository, useValue: systemRepository },
        { provide: PersistenceUtilService, useValue: persistenceUtilService },
        { provide: IntentionUtilService, useValue: intentionUtilService },
        { provide: ValidatorUtil, useValue: validatorUtil },
        { provide: IntentionValidationRuleEngine, useValue: intentionValidationRuleEngine },
        { provide: MikroORM, useValue: orm },
      ],
    }).compile();

    service = module.get<IntentionService>(IntentionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('quickStartPreflight', () => {
    it('should pass when there is exactly one action', () => {
      const intentionDto: IntentionDto = {
        actions: [{ action: 'backup' } as any],
      } as any as IntentionDto;

      expect(() => service.quickStartPreflight(intentionDto)).not.toThrow();
    });

    it('should throw when there are no actions', () => {
      const intentionDto: IntentionDto = {
        actions: [],
      } as any as IntentionDto;

      expect(() => service.quickStartPreflight(intentionDto)).toThrow(BadRequestException);
    });

    it('should throw when there are multiple actions', () => {
      const intentionDto: IntentionDto = {
        actions: [
          { action: 'backup' } as any,
          { action: 'install' } as any,
        ],
      } as any as IntentionDto;

      expect(() => service.quickStartPreflight(intentionDto)).toThrow(BadRequestException);
    });
  });

  describe('open', () => {
    it('should throw when no valid JWT user info', async () => {
      const req = { user: {} } as any;
      const intentionDto: IntentionDto = {
        actions: [{ action: 'backup' } as any],
      } as any as IntentionDto;

      await expect(service.open(req, intentionDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw when TTL is below minimum', async () => {
      const req = { user: validJwtUser() } as any;
      const intentionDto: IntentionDto = {
        actions: [{ action: 'backup' } as any],
      } as any as IntentionDto;

      await expect(service.open(req, intentionDto, 10)).rejects.toThrow(BadRequestException);
    });

    it('should throw when TTL exceeds maximum', async () => {
      const req = { user: validJwtUser() } as any;
      const intentionDto: IntentionDto = {
        actions: [{ action: 'backup' } as any],
      } as any as IntentionDto;

      await expect(service.open(req, intentionDto, 2000)).rejects.toThrow(BadRequestException);
    });
  });
});
