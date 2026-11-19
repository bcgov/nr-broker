import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { MikroORM } from '@mikro-orm/core';
import { ObjectId } from 'mongodb';

import { AccountService } from './account.service';
import { CommunicationQueueService } from '../communication/communication-queue.service';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { SystemRepository } from '../persistence/interfaces/system.repository';
import { DateUtil } from '../util/date.util';
import { BullService } from '../bull/bull.service';

const DAY_IN_SECONDS = 60 * 60 * 24;

describe('AccountService', () => {
  let service: AccountService;
  let systemRepository: {
    findExpiredRegistryJwts: ReturnType<typeof vi.fn>;
  };
  let collectionRepository: {
    getCollectionById: ReturnType<typeof vi.fn>;
  };
  let communicationQueueService: {
    queue: ReturnType<typeof vi.fn>;
  };

  function buildJwt(expInDays: number, jti = 'jti-1') {
    const now = Math.floor(Date.now() / 1000);
    return {
      id: 'jwt-1',
      blocked: false,
      accountId: new ObjectId(),
      claims: {
        client_id: 'client-id',
        exp: now + expInDays * DAY_IN_SECONDS + 3600,
        jti,
        sub: 'sub-1',
      },
      lastUsedAt: undefined,
    };
  }

  function fakeAccount() {
    return {
      name: 'test-account',
      id: new ObjectId(),
      vertex: new ObjectId(),
    };
  }

  // `sendJwtExpirationNotification` is decorated with `@CreateRequestContext()`,
  // which resolves an `EntityManager` from `this.orm.em` and calls `em.fork`.
  // A minimal fake `MikroORM` keeps the decorator happy in the unit test. The
  // value must be `instanceof MikroORM` for the decorator to accept it, so the
  // prototype is attached without invoking the heavy constructor.
  function fakeOrm(): unknown {
    const em = {
      name: 'default',
      fork: () => em,
    };
    const orm = { em };
    return Object.setPrototypeOf(orm, MikroORM.prototype);
  }

  beforeEach(async () => {
    systemRepository = {
      findExpiredRegistryJwts: vi.fn(),
    };
    collectionRepository = {
      getCollectionById: vi.fn(),
    };
    communicationQueueService = {
      queue: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: SystemRepository, useValue: systemRepository },
        {
          provide: CollectionRepository,
          useValue: collectionRepository,
        },
        {
          provide: CommunicationQueueService,
          useValue: communicationQueueService,
        },
        { provide: DateUtil, useValue: new DateUtil() },
        {
          provide: BullService,
          useValue: {
            registerWorker: vi.fn(),
            registerLeaderJob: vi.fn(),
            enqueue: vi.fn(),
          },
        },
        { provide: MikroORM, useValue: fakeOrm() },
      ],
    })
      // The remaining constructor dependencies are unused by the scanner under
      // test; a `vi.fn()` satisfies the injector for them.
      .useMocker(() => vi.fn())
      .compile();

    service = module.get<AccountService>(AccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendJwtExpirationNotification', () => {
    // The private, `@CreateRequestContext`-decorated method is invoked via a
    // cast. `MikroORM` is provided with a minimal `em` above so the decorator
    // can resolve a request context without a real EntityManager.
    function runScanner() {
      return service['sendJwtExpirationNotification']();
    }

    it('uses the same alert key and a 24-hour TTL on repeated scans', async () => {
      const jwt = buildJwt(3);
      systemRepository.findExpiredRegistryJwts.mockResolvedValue([jwt]);
      collectionRepository.getCollectionById.mockResolvedValue(fakeAccount());

      await runScanner();
      await runScanner();

      expect(communicationQueueService.queue).toHaveBeenCalledTimes(2);
      expect(communicationQueueService.queue).toHaveBeenCalledWith(
        'token-expiration-alert',
        expect.any(String),
        expect.any(Array),
        'token-expiration-alert',
        expect.objectContaining({ daysUntilExpiration: 3 }),
        {
          id: `token-expiration-alert:${jwt.claims.jti}:${jwt.claims.exp}:3`,
          ttl: DAY_IN_SECONDS * 1000,
        },
      );
      expect(communicationQueueService.queue.mock.calls[0][5]).toEqual(
        communicationQueueService.queue.mock.calls[1][5],
      );
    });

    it('keeps different tokens, expirations, and thresholds independent', async () => {
      const jwt = buildJwt(3);
      systemRepository.findExpiredRegistryJwts.mockResolvedValue([
        jwt,
        { ...jwt, claims: { ...jwt.claims, jti: 'jti-2' } },
        { ...jwt, claims: { ...jwt.claims, exp: jwt.claims.exp + 60 } },
        { ...jwt, claims: { ...jwt.claims, exp: jwt.claims.exp - DAY_IN_SECONDS } },
      ]);
      collectionRepository.getCollectionById.mockResolvedValue(fakeAccount());

      await runScanner();

      const keys = communicationQueueService.queue.mock.calls.map(
        (call) => call[5].id,
      );
      expect(keys).toHaveLength(4);
      expect(new Set(keys).size).toBe(4);
    });

    it('skips blocked tokens without queuing', async () => {
      const jwt = buildJwt(3);
      jwt.blocked = true;
      systemRepository.findExpiredRegistryJwts.mockResolvedValue([jwt]);

      await runScanner();

      expect(communicationQueueService.queue).not.toHaveBeenCalled();
    });

    it('ignores thresholds outside the alert window', async () => {
      // 4 days out is not in [7, 3, 2, 1].
      systemRepository.findExpiredRegistryJwts.mockResolvedValue([buildJwt(4)]);

      await runScanner();

      expect(communicationQueueService.queue).not.toHaveBeenCalled();
    });

    it('also queues the owner alert only at the 7-day threshold', async () => {
      systemRepository.findExpiredRegistryJwts.mockResolvedValue([buildJwt(7)]);
      collectionRepository.getCollectionById.mockResolvedValue(fakeAccount());

      await runScanner();

      expect(communicationQueueService.queue).toHaveBeenCalledTimes(2);
      expect(
        communicationQueueService.queue.mock.calls.some((call) =>
          call[0] === 'token-expiration-owner',
        ),
      ).toBe(true);
      const [alert, owner] = communicationQueueService.queue.mock.calls;
      expect(alert[5].id).not.toBe(owner[5].id);
      expect(owner[5]).toEqual({
        id: expect.stringMatching(/^token-expiration-owner:/),
        ttl: DAY_IN_SECONDS * 1000,
      });
    });
  });
});
