import { Module } from '@nestjs/common';
import { ValidatorUtil } from './validator.util';
import { DateUtil } from './date.util';
import { ActionUtil } from './action.util';
import { UserUtil } from './user.util';
import { JobQueueUtil } from './job-queue.util';

/**
 * The util module provides utility services to other modules.
 */
@Module({
  imports: [],
  controllers: [],
  providers: [ActionUtil, DateUtil, UserUtil, ValidatorUtil, JobQueueUtil],
  exports: [ActionUtil, DateUtil, UserUtil, ValidatorUtil, JobQueueUtil],
})
export class UtilModule {}
