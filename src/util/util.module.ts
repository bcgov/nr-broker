import { Module } from '@nestjs/common';
import { ValidatorUtil } from './validator.util';

@Module({
  imports: [],
  controllers: [],
  providers: [ValidatorUtil],
  exports: [ValidatorUtil],
})
export class UtilModule {}
