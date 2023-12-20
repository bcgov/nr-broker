import { Module } from '@nestjs/common';
import { ValidatorUtil } from './validator.util';
import { ActionUtil } from './action.util';

@Module({
  imports: [],
  controllers: [],
  providers: [ActionUtil, ValidatorUtil],
  exports: [ActionUtil, ValidatorUtil],
})
export class UtilModule {}
