import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  ConnectionOptions,
  Job,
  Queue,
  QueueEvents,
  Worker,
} from 'bullmq';
import {
  BULL_REDIS,
  BULL_STALLED_INTERVAL_MS,
  BULL_WORKER_CONCURRENCY,
  BullQueueName,
  QUEUE_PROCESSING,
  REDIS_QUEUES,
} from '../constants';

/**
 * Handler for a BullMQ data-queue job. Receives the parsed job payload.
 */
export type BullJobHandler = (job: Job) => Promise<void> | void;

/**
 * Handler for a BullMQ *leader* job. Leader jobs are repeatable, single-node
 * scheduled jobs (the former `@Cron` methods that were gated by
 * `IS_PRIMARY_NODE`). The handler ignores the payload; only the schedule
 * matters.
 */
export type BullLeaderHandler = () => Promise<void> | void;

/**
 * Central owner of all BullMQ queues, workers, and the shared Redis
 * connection.
 *
 * Two kinds of work are coordinated here:
 *
 * 1. **Data queues** (e.g. `notification-coms`, `github-sync-secrets`). Each
 *    consumer service registers a worker via {@link registerWorker}. Processing
 *    is gated by `QUEUE_PROCESSING`, so a dedicated worker run with
 *    `QUEUE_PROCESSING=notification-coms` only consumes that queue. BullMQ
 *    guarantees a job is claimed by exactly one worker, which replaces the old
 *    per-queue re-entrancy guard.
 *
 * 2. **Leader jobs** (e.g. `intention-expiry`, `jwt-lifecycle`). Each
 *    single-node scheduled service registers a repeatable job via
 *    {@link registerLeaderJob}. BullMQ's repeat mechanism fires each job once
 *    per schedule tick across *all* replicas and the standalone worker, which
 *    replaces the static `IS_PRIMARY_NODE` leader election.
 */
@Injectable()
export class BullService
implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BullService.name);

  private readonly dataQueues = new Map<string, Queue>();
  private readonly dataWorkers = new Map<string, Worker>();
  private readonly leaderHandlers = new Map<string, BullLeaderHandler>();
  private readonly enabledQueues: ReadonlySet<string>;

  private leaderQueue: Queue | undefined;
  private leaderWorker: Worker | undefined;
  private leaderQueueEvents: QueueEvents | undefined;

  constructor(
    @Inject('BULL_REDIS_CONNECTION')
    private readonly connection: ConnectionOptions,
    rawQueueProcessing: string = QUEUE_PROCESSING,
  ) {
    this.enabledQueues = this.parseQueueProcessing(rawQueueProcessing);
  }

  private parseQueueProcessing(raw: string): ReadonlySet<string> {
    const values = raw
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (values.length === 0) {
      return new Set<string>();
    }

    if (values.includes('all')) {
      return new Set<string>(Object.values(REDIS_QUEUES));
    }

    const known = new Set<string>(Object.values(REDIS_QUEUES));
    const enabled = new Set<string>();
    for (const value of values) {
      if (known.has(value)) {
        enabled.add(value);
      } else {
        this.logger.warn(
          `QUEUE_PROCESSING: unknown queue identifier "${value}" ignored. ` +
          `Known queues: ${Array.from(known).join(', ')} or "all".`,
        );
      }
    }
    return enabled;
  }

  /**
   * Lazily create the leader queue + worker on first use. Lazy creation
   * removes the dependency on NestJS `onModuleInit` ordering: a consumer
   * service may register its leader job in its own `onModuleInit` before
   * {@link onModuleInit} runs, so the queue must not be a fixed field.
   */
  private ensureLeader(): void {
    if (this.leaderWorker) {
      return;
    }
    // The leader worker runs in every process that boots the app (main server
    // and standalone queue worker). Because BullMQ claims each job for exactly
    // one worker, a repeatable leader job fires once per tick regardless of
    // how many processes are running.
    this.leaderQueue = new Queue('leader', { connection: this.connection });
    this.leaderWorker = new Worker(
      'leader',
      async (job: Job) => {
        const handler = this.leaderHandlers.get(job.name);
        if (!handler) {
          this.logger.warn(
            `Leader job "${job.name}" fired but has no registered handler`,
          );
          return;
        }
        await handler();
      },
      {
        connection: this.connection,
        stalledInterval: BULL_STALLED_INTERVAL_MS,
        concurrency: BULL_WORKER_CONCURRENCY,
      },
    );
    this.leaderWorker.on('failed', (job: Job, err: Error) => {
      this.logger.error(
        `Leader job "${job?.name}" failed: ${err.message}`,
        err.stack,
      );
    });
    this.leaderQueueEvents = new QueueEvents('leader', {
      connection: this.connection,
    });
    this.logger.log('BullMQ leader worker started');
  }

  async onModuleInit(): Promise<void> {
    // Eagerly start the leader worker so a leader-only process does not have
    // to wait for the first registration. Registration is still lazy-safe.
    this.ensureLeader();
  }

  /**
   * Register a BullMQ worker for a data queue. The worker is only created
  * when `QUEUE_PROCESSING` enables the queue, so a dedicated worker processes
  * only its assigned queue.
   *
   * @param queueName One of the `REDIS_QUEUES` identifiers.
   * @param handler Processor invoked with each claimed job.
   */
  public registerWorker(
    queueName: BullQueueName,
    handler: BullJobHandler,
  ): void {
    if (!this.enabledQueues.has(queueName)) {
      this.logger.log(
        `Queue "${queueName}" is not enabled by QUEUE_PROCESSING; skipping worker`,
      );
      return;
    }
    if (this.dataWorkers.has(queueName)) {
      return;
    }
    const queue = new Queue(queueName, { connection: this.connection });
    this.dataQueues.set(queueName, queue);

    const worker = new Worker(
      queueName,
      async (job: Job) => {
        // "Process once, no retry": catch and log per-job errors so a single
        // failed job neither retries nor stops the worker. This mirrors the
        // prior poller behaviour where errors were logged and swallowed.
        try {
          await handler(job);
        } catch (error) {
          this.logger.error(
            `Job ${job.id} on "${queueName}" failed: ${
              (error as Error).message
            }`,
            (error as Error).stack,
          );
        }
      },
      {
        connection: this.connection,
        stalledInterval: BULL_STALLED_INTERVAL_MS,
        concurrency: BULL_WORKER_CONCURRENCY,
      },
    );
    worker.on('failed', (job: Job, err: Error) => {
      this.logger.error(
        `Job ${job?.id} on "${queueName}" moved to failed: ${err.message}`,
        err.stack,
      );
    });
    this.dataWorkers.set(queueName, worker);
    this.logger.log(`BullMQ worker started for "${queueName}"`);
  }

  /**
   * Add a job to a data queue. Creates the queue lazily on first use so that
   * producer-only processes (which never consume) still get a queue.
   *
   * @param queueName One of the `REDIS_QUEUES` identifiers.
   * @param data The structured job payload.
   * @param opts Optional BullMQ add options.
   */
  public async enqueue<T = unknown>(
    queueName: BullQueueName,
    data: T,
    opts?: { jobId?: string; delay?: number; attempts?: number },
  ): Promise<void> {
    const queue = this.dataQueues.get(queueName) ??
      new Queue(queueName, { connection: this.connection });
    this.dataQueues.set(queueName, queue);
    await queue.add(queueName, data as Record<string, unknown>, opts);
  }

  /**
   * Register a repeatable leader job and add it to the leader queue.
   *
   * The job is added once per process boot; BullMQ deduplicates repeatable
   * jobs by their deterministic repeat key (name + schedule), so adding it
   * from every replica and the worker does not create duplicates.
   *
   * @param jobName One of the `BULL_LEADER_JOBS` identifiers.
   * @param cronPattern A cron expression (e.g. `'* * * * *'` for every minute).
   * @param handler The handler invoked once per tick on a single node.
   */
  public async registerLeaderJob(
    jobName: string,
    cronPattern: string,
    handler: BullLeaderHandler,
  ): Promise<void> {
    this.ensureLeader();
    this.leaderHandlers.set(jobName, handler);
    await this.leaderQueue.add(
      jobName,
      {},
      {
        repeat: { pattern: cronPattern },
        jobId: jobName,
      },
    );
    this.logger.log(
      `BullMQ leader job "${jobName}" scheduled (${cronPattern})`,
    );
    try {
      await handler();
    } catch (error) {
      this.logger.error(
        `Leader job "${jobName}" failed: ${
          (error as Error).message
        }`,
        (error as Error).stack,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    const closers = [
      this.leaderWorker,
      this.leaderQueue,
      this.leaderQueueEvents,
      ...this.dataWorkers.values(),
      ...this.dataQueues.values(),
    ].filter((x) => x !== undefined);
    await Promise.all(
      closers.map((c) =>
        (c as Queue | Worker | QueueEvents).close().catch((err) => {
          this.logger.error(`Error closing BullMQ resource: ${
            (err as Error).message
          }`);
        }),
      ),
    );
    this.logger.log('BullMQ resources closed');
  }
}

/**
 * Build the BullMQ Redis connection from the shared `REDIS_*` env vars,
 * mirroring the persistence `REDIS_CLIENT` factory so both clients target the
 * same Redis.
 *
 * This returns ioredis connection *options* (the single-node case), which
 * BullMQ wraps into its own pooled connections. When `REDIS_REPLICAS` is set
 * the persistence layer uses a cluster; BullMQ cluster support would require a
 * pre-built IORedis cluster instance and is intentionally left to a future
 * extension. `maxRetriesPerRequest: null` is required by BullMQ so it can
 * manage its own retry semantics.
 */
export function buildBullConnection(): ConnectionOptions {
  return {
    host: BULL_REDIS.host,
    port: BULL_REDIS.port,
    ...(BULL_REDIS.username ? { username: BULL_REDIS.username } : {}),
    ...(BULL_REDIS.password ? { password: BULL_REDIS.password } : {}),
    maxRetriesPerRequest: null,
  };
}
