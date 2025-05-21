import { Injectable } from '@nestjs/common';
import { REDIS_QUEUES, CRON_JOB_SEND_EMAILS } from '../constants';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CreateRequestContext, MikroORM } from '@mikro-orm/core';
import { RedisService } from '../redis/redis.service';
import { EmailService } from './email.service';
import { JobQueueUtil } from '../util/job-queue.util';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class EmailQueueService {
  constructor(
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly jobQueueUtil: JobQueueUtil,
    private readonly orm: MikroORM,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: CRON_JOB_SEND_EMAILS })
  @CreateRequestContext()
  async pollEmailQueue(): Promise<void> {
    await this.jobQueueUtil.refreshJobWrap(
      this.schedulerRegistry,
      CRON_JOB_SEND_EMAILS,
      REDIS_QUEUES.NOTIFIFICATION_EMAILS,
      () =>
        this.redisService.dequeue(
          REDIS_QUEUES.NOTIFIFICATION_EMAILS,
        ) as Promise<string | null>,
      async (jobString: string) => {
        const { to, subject, context } = JSON.parse(jobString);
        try {
          await this.emailService.sendAlertEmail(to, subject, context);
          this.auditService.recordAccountTokenLifecycle(
            null,
            context,
            `Successfully sent expiration email(s) to ${to} (client_id: ${context.client_id})`,
            'info',
            'success',
            ['token', 'email', 'notification'],
          );
        } catch (error) {
          this.auditService.recordAccountTokenLifecycle(
            null,
            context,
            `Failed to send expiration email(s) to ${to} (client_id: ${context.client_id}): ${error.message}`,
            'info',
            'failure',
            ['token', 'email', 'notification'],
          );
        }
      },
    );
  }
}
