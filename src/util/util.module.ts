import { Module } from '@nestjs/common';
import { ValidatorUtil } from './validator.util';
import { DateUtil } from './date.util';
import { ActionUtil } from './action.util';

/**
 * The util module provides utility services to other modules.
 */
@Module({
  imports: [],
  controllers: [],
  providers: [ActionUtil, DateUtil, ValidatorUtil],
  exports: [ActionUtil, DateUtil, ValidatorUtil],
})
export class UtilModule {}
