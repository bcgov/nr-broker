import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class JobQueueUtil {
  async refreshJobWrap(
    schedulerRegistry: SchedulerRegistry,
    jobName: string,
    queueName: string,
    dequeueFn: () => Promise<string | null>,
    processFn: (job: string) => Promise<void>,
  ) {
    const job = schedulerRegistry.getCronJob(jobName);
    job.stop();
    try {
      const jobData = await dequeueFn();
      if (jobData) {
        await processFn(jobData);
      }
    } catch (error) {
      // Optionally log or handle error
    } finally {
      job.start();
    }
  }
}
