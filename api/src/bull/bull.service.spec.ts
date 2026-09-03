import { afterEach, beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import { Logger } from '@nestjs/common';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { BullService, buildBullConnection } from './bull.service';
import {
  BULL_REDIS,
  BULL_STALLED_INTERVAL_MS,
  BULL_WORKER_CONCURRENCY,
  BULL_LEADER_JOBS,
  REDIS_QUEUES,
} from '../constants';

/**
 * The BullMQ classes are captured in hoisted mock containers so the tests can
 * inspect the constructed queues/workers/queue-events and drive their stored
 * processors. `vi.hoisted` runs before the top-level imports so the mock
 * factory can reference the classes without an "access before initialization".
 */
const {
  queueInstances,
  workerInstances,
  queueEventsInstances,
  MockQueue,
  MockWorker,
  MockQueueEvents,
} = vi.hoisted(() => {
  const queueInstances: Array<{
    name: string;
    opts: unknown;
    add: Mock;
    close: Mock;
  }> = [];
  const workerInstances: Array<{
    name: string;
    processor: (job: unknown) => Promise<void>;
    opts: { stalledInterval: number; concurrency: number };
    handlers: Record<string, (job: unknown, err: Error) => void>;
    close: Mock;
  }> = [];
  const queueEventsInstances: Array<{ close: Mock }> = [];

  class MockQueue {
    add: Mock;
    close: Mock;

    constructor(
      public name: string,
      public opts: unknown,
    ) {
      this.add = vi.fn(async () => undefined);
      this.close = vi.fn(async () => undefined);
      queueInstances.push(this);
    }
  }

  class MockWorker {
    handlers: Record<string, (job: unknown, err: Error) => void> = {};
    close: Mock;

    constructor(
      public name: string,
      public processor: (job: unknown) => Promise<void>,
      public opts: { stalledInterval: number; concurrency: number },
    ) {
      this.close = vi.fn(async () => undefined);
      workerInstances.push(this);
    }

    on(event: string, handler: (job: unknown, err: Error) => void): this {
      this.handlers[event] = handler;
      return this;
    }

    emit(event: string, ...args: Array<unknown>): void {
      this.handlers[event]?.(...args);
    }
  }

  class MockQueueEvents {
    close: Mock;

    constructor() {
      this.close = vi.fn(async () => undefined);
      queueEventsInstances.push(this);
    }
  }

  return {
    queueInstances,
    workerInstances,
    queueEventsInstances,
    MockQueue,
    MockWorker,
    MockQueueEvents,
  };
});

vi.mock('bullmq', () => ({
  Queue: MockQueue,
  Worker: MockWorker,
  QueueEvents: MockQueueEvents,
  // Type-only names referenced from the same import line; provide inert
  // placeholders so the transformed import binding resolves at runtime.
  ConnectionOptions: undefined,
  Job: undefined,
}));

const fakeConnection = {
  host: 'localhost',
  port: 6379,
} as unknown as import('bullmq').ConnectionOptions;
const forkedEntityManager = {};
const fakeOrm = {
  em: {
    name: 'default',
    fork: vi.fn(() => forkedEntityManager),
  },
} as unknown as MikroORM;

beforeEach(() => {
  vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildBullConnection', () => {
  it('returns ioredis options mirroring BULL_REDIS with null maxRetriesPerRequest', () => {
    const connection = buildBullConnection();

    expect(connection.maxRetriesPerRequest).toBe(null);
    expect(connection.host).toBe(BULL_REDIS.host);
    expect(connection.port).toBe(BULL_REDIS.port);
  });

  it('includes username and password only when BULL_REDIS defines them', () => {
    const connection = buildBullConnection() as Record<string, unknown>;

    expect('username' in connection).toBe(BULL_REDIS.username !== undefined);
    expect('password' in connection).toBe(BULL_REDIS.password !== undefined);
  });
});

describe('BullService.registerWorker', () => {
  let service: BullService;

  beforeEach(() => {
    queueInstances.length = 0;
    workerInstances.length = 0;
    queueEventsInstances.length = 0;
  });

  it('skips creating a worker when the queue is not enabled by QUEUE_PROCESSING', () => {
    service = new BullService(fakeConnection, fakeOrm, '');
    const log = vi
      .spyOn(service['logger'] as import('@nestjs/common').Logger, 'log');

    service.registerWorker(REDIS_QUEUES.NOTIFICATION_COMS, async () => undefined);

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('skipping worker'),
    );
    expect(queueInstances).toHaveLength(0);
    expect(workerInstances).toHaveLength(0);
  });

  it('creates a queue and a worker for an enabled queue', () => {
    service = new BullService(
      fakeConnection,
      fakeOrm,
      REDIS_QUEUES.NOTIFICATION_COMS,
    );

    service.registerWorker(REDIS_QUEUES.NOTIFICATION_COMS, async () => undefined);

    expect(queueInstances).toHaveLength(1);
    expect(queueInstances[0].name).toBe(REDIS_QUEUES.NOTIFICATION_COMS);
    expect(workerInstances).toHaveLength(1);
    expect(workerInstances[0].name).toBe(REDIS_QUEUES.NOTIFICATION_COMS);
    expect(workerInstances[0].opts).toMatchObject({
      stalledInterval: BULL_STALLED_INTERVAL_MS,
      concurrency: BULL_WORKER_CONCURRENCY,
    });
  });

  it('creates workers for every queue when processing is set to all', () => {
    service = new BullService(fakeConnection, fakeOrm, 'all');

    service.registerWorker(REDIS_QUEUES.NOTIFICATION_COMS, async () => undefined);
    service.registerWorker(REDIS_QUEUES.GITHUB_SYNC_SECRETS, async () => undefined);

    expect(workerInstances).toHaveLength(2);
  });

  it('creates workers only for queues listed in the processing configuration', () => {
    service = new BullService(
      fakeConnection,
      fakeOrm,
      `${REDIS_QUEUES.NOTIFICATION_COMS}, ${REDIS_QUEUES.KUBERNETES_SYNC_SECRETS}`,
    );

    service.registerWorker(REDIS_QUEUES.NOTIFICATION_COMS, async () => undefined);
    service.registerWorker(REDIS_QUEUES.KUBERNETES_SYNC_SECRETS, async () => undefined);
    service.registerWorker(REDIS_QUEUES.GITHUB_SYNC_SECRETS, async () => undefined);

    expect(workerInstances.map((worker) => worker.name)).toEqual([
      REDIS_QUEUES.NOTIFICATION_COMS,
      REDIS_QUEUES.KUBERNETES_SYNC_SECRETS,
    ]);
  });

  it('does not create workers for unknown queue identifiers', () => {
    service = new BullService(fakeConnection, fakeOrm, 'does-not-exist');

    service.registerWorker(REDIS_QUEUES.NOTIFICATION_COMS, async () => undefined);

    expect(workerInstances).toHaveLength(0);
  });

  it('does not create a second worker for the same queue', () => {
    service = new BullService(
      fakeConnection,
      fakeOrm,
      REDIS_QUEUES.NOTIFICATION_COMS,
    );

    service.registerWorker(REDIS_QUEUES.NOTIFICATION_COMS, async () => undefined);
    service.registerWorker(REDIS_QUEUES.NOTIFICATION_COMS, async () => undefined);

    expect(
      workerInstances.filter((w) => w.name === REDIS_QUEUES.NOTIFICATION_COMS),
    ).toHaveLength(1);
  });

  it('swallows a handler error so a single failed job does not stop the worker', async () => {
    service = new BullService(
      fakeConnection,
      fakeOrm,
      REDIS_QUEUES.NOTIFICATION_COMS,
    );
    const error = vi
      .spyOn(service['logger'] as import('@nestjs/common').Logger, 'error');

    const handler = vi.fn(async () => {
      throw new Error('job boom');
    });
    service.registerWorker(REDIS_QUEUES.NOTIFICATION_COMS, handler);

    const processor = workerInstances[0].processor;
    await expect(processor({ id: '1' })).resolves.toBeUndefined();
    expect(handler).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('failed'),
      expect.anything(),
    );
  });

  it('runs the handler in a MikroORM request context', async () => {
    service = new BullService(
      fakeConnection,
      fakeOrm,
      REDIS_QUEUES.NOTIFICATION_COMS,
    );
    let handlerEntityManager: unknown;

    service.registerWorker(REDIS_QUEUES.NOTIFICATION_COMS, async () => {
      handlerEntityManager = RequestContext.getEntityManager();
    });

    await workerInstances[0].processor({ id: '1' });

    expect(handlerEntityManager).toBe(forkedEntityManager);
  });

  it('registers a failed listener that logs when a job is moved to failed', () => {
    service = new BullService(
      fakeConnection,
      fakeOrm,
      REDIS_QUEUES.NOTIFICATION_COMS,
    );
    const error = vi
      .spyOn(service['logger'] as import('@nestjs/common').Logger, 'error');

    service.registerWorker(REDIS_QUEUES.NOTIFICATION_COMS, async () => undefined);

    const worker = workerInstances[0];
    expect(typeof worker.handlers['failed']).toBe('function');
    worker.emit('failed', { id: '1' }, new Error('moved to failed'));
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('moved to failed'),
      expect.anything(),
    );
  });
});

describe('BullService.enqueue', () => {
  let service: BullService;

  beforeEach(() => {
    queueInstances.length = 0;
    workerInstances.length = 0;
    queueEventsInstances.length = 0;
    service = new BullService(fakeConnection, fakeOrm, '');
  });

  it('lazily creates a queue and adds the job with the given options', async () => {
    await service.enqueue(REDIS_QUEUES.GITHUB_SYNC_SECRETS, { a: 1 }, {
      jobId: 'job-1',
      delay: 100,
      attempts: 3,
    });

    expect(queueInstances).toHaveLength(1);
    expect(queueInstances[0].name).toBe(REDIS_QUEUES.GITHUB_SYNC_SECRETS);
    expect(queueInstances[0].add).toHaveBeenCalledWith(
      REDIS_QUEUES.GITHUB_SYNC_SECRETS,
      { a: 1 },
      { jobId: 'job-1', delay: 100, attempts: 3 },
    );
  });

  it('reuses the queue already created for the same name', async () => {
    await service.enqueue(REDIS_QUEUES.GITHUB_SYNC_USERS, {});
    await service.enqueue(REDIS_QUEUES.GITHUB_SYNC_USERS, {});

    expect(queueInstances).toHaveLength(1);
    expect(queueInstances[0].add).toHaveBeenCalledTimes(2);
  });
});

describe('BullService.registerLeaderJob', () => {
  let service: BullService;

  beforeEach(() => {
    queueInstances.length = 0;
    workerInstances.length = 0;
    queueEventsInstances.length = 0;
    service = new BullService(fakeConnection, fakeOrm, '');
  });

  it('schedules the repeatable job and invokes the handler once', async () => {
    const handler = vi.fn(async () => undefined);

    await service.registerLeaderJob(
      BULL_LEADER_JOBS.INTENTION_EXPIRY,
      '* * * * *',
      handler,
    );

    const leaderQueue = queueInstances.find((q) => q.name === 'leader');
    expect(leaderQueue).toBeDefined();
    expect(leaderQueue!.add).toHaveBeenCalledWith(
      BULL_LEADER_JOBS.INTENTION_EXPIRY,
      {},
      { repeat: { pattern: '* * * * *' }, jobId: BULL_LEADER_JOBS.INTENTION_EXPIRY },
    );
    expect(handler).toHaveBeenCalledOnce();
  });

  it('logs and swallows a handler error while still scheduling the job', async () => {
    const error = vi
      .spyOn(service['logger'] as import('@nestjs/common').Logger, 'error');
    const handler = vi.fn(async () => {
      throw new Error('leader boom');
    });

    await expect(
      service.registerLeaderJob(BULL_LEADER_JOBS.JWT_LIFECYCLE, '0 0 * * *', handler),
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('failed'),
      expect.anything(),
    );
  });
});

describe('BullService leader worker', () => {
  let service: BullService;

  beforeEach(() => {
    queueInstances.length = 0;
    workerInstances.length = 0;
    queueEventsInstances.length = 0;
    service = new BullService(fakeConnection, fakeOrm, '');
  });

  const leaderWorker = () =>
    workerInstances.find((w) => w.name === 'leader');

  it('onModuleInit eagerly starts the leader worker, queue, and queue events', async () => {
    await service.onModuleInit();

    expect(leaderWorker()).toBeDefined();
    expect(
      queueInstances.some((q) => q.name === 'leader'),
    ).toBe(true);
    expect(queueEventsInstances).toHaveLength(1);
  });

  it('dispatches a fired leader job to its registered handler', async () => {
    let handlerEntityManager: unknown;
    const handler = vi.fn(async () => {
      handlerEntityManager = RequestContext.getEntityManager();
    });
    await service.registerLeaderJob(BULL_LEADER_JOBS.COLLECTION_SYNC, '* * * * *', handler);

    // reset the call from scheduling so we only count the worker dispatch
    handler.mockClear();
    const worker = leaderWorker();
    expect(worker).toBeDefined();
    await worker!.processor({ name: BULL_LEADER_JOBS.COLLECTION_SYNC });

    expect(handler).toHaveBeenCalledOnce();
    expect(handlerEntityManager).toBe(forkedEntityManager);
  });

  it('logs a warning when a fired leader job has no registered handler', async () => {
    const warn = vi
      .spyOn(service['logger'] as import('@nestjs/common').Logger, 'warn');
    await service.onModuleInit();

    const worker = leaderWorker();
    expect(worker).toBeDefined();
    await worker!.processor({ name: 'does-not-exist' });

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('no registered handler'),
    );
  });
});

describe('BullService.onModuleDestroy', () => {
  let service: BullService;

  beforeEach(() => {
    queueInstances.length = 0;
    workerInstances.length = 0;
    queueEventsInstances.length = 0;
    service = new BullService(
      fakeConnection,
      fakeOrm,
      REDIS_QUEUES.NOTIFICATION_COMS,
    );
  });

  it('closes every leader and data resource', async () => {
    await service.onModuleInit(); // leader worker + queue + queueEvents
    service.registerWorker(REDIS_QUEUES.NOTIFICATION_COMS, async () => undefined);

    await service.onModuleDestroy();

    for (const worker of workerInstances) {
      expect(worker.close).toHaveBeenCalledOnce();
    }
    for (const queue of queueInstances) {
      expect(queue.close).toHaveBeenCalledOnce();
    }
    for (const events of queueEventsInstances) {
      expect(events.close).toHaveBeenCalledOnce();
    }
  });

  it('logs and continues when a resource fails to close', async () => {
    const error = vi
      .spyOn(service['logger'] as import('@nestjs/common').Logger, 'error');
    await service.onModuleInit();
    queueEventsInstances[0].close.mockRejectedValue(new Error('close boom'));

    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Error closing BullMQ resource'),
    );
  });
});
