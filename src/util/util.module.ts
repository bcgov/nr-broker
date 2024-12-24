import { Module } from '@nestjs/common';
import { ValidatorUtil } from './validator.util';
import { DateUtil } from './date.util';
import { ActionUtil } from './action.util';
import { UserUtil } from './user.util';

/**
 * The util module provides utility services to other modules.
 */
@Module({
  imports: [],
  controllers: [],
  providers: [ActionUtil, DateUtil, UserUtil, ValidatorUtil],
  exports: [ActionUtil, DateUtil, UserUtil, ValidatorUtil],
})
export class UtilModule {}
