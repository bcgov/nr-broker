import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CreateRequestContext, MikroORM } from '@mikro-orm/core';
import ejs from 'ejs';
import { v4 as uuidv4 } from 'uuid';
import { REDIS_QUEUES, CRON_JOB_SEND_COMS } from '../constants';
import { RedisService } from '../redis/redis.service';
import { JobQueueUtil } from '../util/job-queue.util';
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
  uuid: string;
  vertexId: string;
  toUsers: CommunicationUserRef[];
  optionalUsers: CommunicationUserRef[];
  template: string;
  context: ejs.Data;
}

@Injectable()
export class CommunicationQueueService {
  private readonly logger = new Logger(CommunicationQueueService.name);

  constructor(
    private readonly auditService: AuditService,
    @Inject(COMMUNICATION_TASKS)
    private readonly communicationTasks: Array<CommunicationTaskService>,
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly redisService: RedisService,
    private readonly jobQueueUtil: JobQueueUtil,
    private readonly orm: MikroORM,
  ) {}

  queue(
    type: string,
    vertexId: string,
    toUsers: CommunicationUserRef[],
    template: string,
    context: ejs.Data,
  ): Promise<void> {
    const job = {
      uuid: uuidv4(),
      type,
      vertexId,
      toUsers,
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
    return this.redisService.queue(
      REDIS_QUEUES.NOTIFICATION_COMS,
      JSON.stringify(job),
    );
  }

  @Cron(CronExpression.EVERY_30_SECONDS, {
    name: CRON_JOB_SEND_COMS,
  })
  @CreateRequestContext()
  async pollQueue(): Promise<void> {
    try {
      await this.jobQueueUtil.refreshJobWrap(
        this.schedulerRegistry,
        CRON_JOB_SEND_COMS,
        REDIS_QUEUES.NOTIFICATION_COMS,
        () =>
          this.redisService.dequeue(REDIS_QUEUES.NOTIFICATION_COMS) as Promise<
            string | null
          >,
        async (jobString: string) => {
          let userCount = 0;
          let failCount = 0;
          const job = JSON.parse(jobString) as CommunicationJob;
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
                `Failed to send to ${user.email}: ${error.message}`,
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
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to poll communication queue: ${error.message}`,
        error.stack,
      );
    }
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
        const watchers = await this.graphRepository.getWatches(
          job.vertexId,
        );
        const configuredUsers = new Set<string>();
        for (const watcher of watchers) {
          // Add all users with configured watches to prevent default notifications
          configuredUsers.add(watcher.user.toString());

          // Only send notification if their specific watch matches the channel/event
          if (watcher.watches.findIndex(
            (watch) => channels.includes(watch.channel) && (!watch.events || watch.events.includes(jobUser.event)),
          ) !== -1) {
            const user = await this.collectionRepository.getCollectionByVertexId('user', watcher.user.toString());
            if (user) {
              userArr.push(user as unknown as UserDto);
            }
          }
        }
        const watchDefaultConfigs = await this.graphRepository.getDefaultWatchConfigsByVertex(
          job.vertexId,
          jobUser.value,
        );
        for (const watchConfig of watchDefaultConfigs) {
          if (watchConfig.watches.findIndex(
            (watch) => channels.includes(watch.channel) && (!watch.events || watch.events.includes(jobUser.event)),
          ) === -1) {
            continue;
          }
          const watchUsers = await this.graphRepository.getUpstreamVertex<UserDto>(
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
