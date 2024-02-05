import { Module } from '@nestjs/common';
import { ValidatorUtil } from './validator.util';
import { ActionUtil } from './action.util';

/**
 * The util module provides utility services to other modules.
 */
@Module({
  imports: [],
  controllers: [],
  providers: [ActionUtil, ValidatorUtil],
  exports: [ActionUtil, ValidatorUtil],
})
export class UtilModule {}
