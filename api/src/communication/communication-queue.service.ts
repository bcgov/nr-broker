import {
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { Job } from 'bullmq';
import ejs from 'ejs';
import { v4 as uuidv4 } from 'uuid';
import { REDIS_QUEUES } from '../constants';
import { BullService } from '../bull/bull.service';
import { AuditService } from '../audit/audit.service';
import { CollectionNameEnum } from '../persistence/dto/collection-dto-union.type';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { UserDto } from '../persistence/dto/user.dto';
import { CommunicationTaskService } from './communication-task.service';
import { COMMUNICATION_TASKS } from './communication.constants';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';

type CommunicationUserRef =
  | {
    ref: 'upstream'; // upstream users by role
    value: string | string[] | null; // role name or names
    optional?: boolean;
  }
  | {
    ref: 'watch'; // watchers of vertex
    value: string | string[]; // channel or channels
    event: string;
    optional?: boolean;
  };

interface CommunicationJob {
  type: string;
  uuid: string;
  vertexId: string;
  toUsers: CommunicationUserRef[];
  optionalUsers: CommunicationUserRef[];
  template: string;
  context: ejs.Data;
}

/**
 * Produces notification jobs onto the `notification-coms` BullMQ queue and
 * consumes them via a BullMQ worker.
 *
 * The producer ({@link queue}) is called by controllers and other services; the
 * consumer worker is registered in {@link onModuleInit}. The worker is only
 * created when `QUEUE_PROCESSING` enables the queue, so a dedicated worker
 * (e.g. `QUEUE_PROCESSING=notification-coms`) is the sole consumer.
 */
@Injectable()
export class CommunicationQueueService implements OnModuleInit {
  constructor(
    private readonly auditService: AuditService,
    @Inject(COMMUNICATION_TASKS)
    private readonly communicationTasks: Array<CommunicationTaskService>,
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
    private readonly bullService: BullService,
  ) {}

  onModuleInit(): void {
    // Consume notification jobs. `BullService.registerWorker` gates on
    // `QUEUE_PROCESSING` via `JobQueueUtil`, so a worker is only started for
    // the queue(s) this process owns.
    this.bullService.registerWorker(
      REDIS_QUEUES.NOTIFICATION_COMS,
      async (job: Job) => {
        await this.processJob(job.data as CommunicationJob);
      },
    );
  }

  /**
   * Queue a notification job.
   *
   * @param type The notification type/template key.
   * @param vertexId The vertex the notification is scoped to.
   * @param toUsers The recipients (upstream roles or vertex watchers).
   * @param template The communication template key.
   * @param context The EJS render context.
   */
  queue(
    type: string,
    vertexId: string,
    toUsers: CommunicationUserRef[],
    template: string,
    context: ejs.Data,
  ): Promise<void> {
    const job: CommunicationJob = {
      uuid: uuidv4(),
      type,
      vertexId,
      toUsers,
      optionalUsers: [],
      template,
      context,
    };
    this.auditService.recordCommunications(
      job.uuid,
      `Communication queued: ${job.uuid} [${job.type}]`,
      'info',
      'unknown',
      ['communication'],
    );
    // Enqueue a structured BullMQ job. The consumer reads `job.data` directly
    // (no JSON parse), and `jobId` = uuid prevents duplicate enqueues.
    return this.bullService.enqueue(
      REDIS_QUEUES.NOTIFICATION_COMS,
      job,
      { jobId: job.uuid },
    );
  }

  /**
   * Process a single notification job: resolve the recipient users and send each
   * communication. Per-user errors are logged but do not fail the job.
   */
  private async processJob(job: CommunicationJob): Promise<void> {
    let userCount = 0;
    let failCount = 0;
    const notifiedUsers = new Set<string>();
    this.auditService.recordCommunications(
      job.uuid,
      `Communication job: ${job.uuid}`,
      'start',
      'unknown',
      ['communication'],
    );
    const users = await this.getUserArr(job);

    if (users.length === 0) {
      this.auditService.recordCommunications(
        job.uuid,
        `Communication job ${job.uuid} found no users`,
        'end',
        'unknown',
        ['communication'],
      );
      return;
    }

    for (const user of users) {
      if (notifiedUsers.has(user.id)) {
        continue; // Skip if already notified
      }
      notifiedUsers.add(user.id);
      userCount++;
      this.auditService.recordCommunications(
        job.uuid,
        `Communication job for user: ${user.email}`,
        'start',
        'unknown',
        ['communication'],
      );
      try {
        for (const communicationService of this.communicationTasks) {
          await communicationService.send(user, job.template, job.context);
        }
      } catch (error) {
        failCount++;
        this.auditService.recordCommunications(
          job.uuid,
          `Failed to send to ${user.email}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'info',
          'failure',
          ['email', 'communication'],
        );
      }
    }
    this.auditService.recordCommunications(
      job.uuid,
      `Communication job ${job.uuid} completed for ${userCount} users with ${failCount} failures`,
      'end',
      failCount > 0 ? 'failure' : 'success',
      ['communication'],
    );
  }

  async getUserArr(job: CommunicationJob): Promise<UserDto[]> {
    const userArr: UserDto[] = [];
    for (const jobUser of job.toUsers) {
      if (jobUser.optional && userArr.length > 0) {
        continue; // Skip optional users if we already have users
      }
      if (jobUser.ref === 'upstream') {
        const users = await this.graphRepository.getUpstreamVertex<UserDto>(
          job.vertexId,
          CollectionNameEnum.user,
          Array.isArray(jobUser.value) ? jobUser.value : [jobUser.value],
        );

        userArr.push(...users.map((user) => user.collection));
      } else if (jobUser.ref === 'watch') {
        const channels = Array.isArray(jobUser.value)
          ? jobUser.value
          : [jobUser.value];
        const watchers = await this.graphRepository.getWatches(job.vertexId);
        const configuredUsers = new Set<string>();
        for (const watcher of watchers) {
          // Add all users with configured watches to prevent default notifications
          configuredUsers.add(watcher.user.toString());

          // Only send notification if their specific watch matches the channel/event
          const matches = watcher.watches.some(
            (watch) =>
              !!watch.events &&
              channels.includes(watch.channel) &&
              watch.events.includes(jobUser.event),
          );
          if (matches) {
            const user =
              await this.collectionRepository.getCollectionByVertexId(
                'user',
                watcher.user.toString(),
              );
            if (user) {
              userArr.push(user as unknown as UserDto);
            }
          }
        }
        const watchDefaultConfigs =
          await this.graphRepository.getDefaultWatchConfigsByVertex(
            job.vertexId,
            jobUser.value,
          );
        for (const watchConfig of watchDefaultConfigs) {
          const matches = watchConfig.watches.some(
            (watch) =>
              channels.includes(watch.channel) &&
              (!watch.events || watch.events.includes(jobUser.event)),
          );
          if (!matches) {
            continue;
          }
          const watchUsers =
            await this.graphRepository.getUpstreamVertex<UserDto>(
              job.vertexId,
              CollectionNameEnum.user,
              watchConfig.roles,
            );
          for (const watchUser of watchUsers) {
            if (configuredUsers.has(watchUser.collection.vertex.toString())) {
              continue; // Skip users with saved configuration watches
            }
            userArr.push(watchUser.collection);
          }
        }
      } else {
        this.auditService.recordCommunications(
          job.uuid,
          `Communication job: ${job.uuid} (Unknown user ref)`,
          'info',
          'unknown',
          ['communication'],
        );
      }
    }
    return userArr;
  }
}
