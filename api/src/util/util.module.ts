import { Module } from '@nestjs/common';
import { ValidatorUtil } from './validator.util';
import { DateUtil } from './date.util';
import { ActionUtil } from './action.util';
import { UserUtil } from './user.util';
import { BrokerTokenUtil } from './broker-token.util';
import { CatalogUtil } from './catalog.util';

/**
 * The util module provides utility services to other modules.
 */
@Module({
  imports: [],
  controllers: [],
  providers: [
    ActionUtil,
    DateUtil,
    UserUtil,
    ValidatorUtil,
    BrokerTokenUtil,
    CatalogUtil,
  ],
  exports: [
    ActionUtil,
    DateUtil,
    UserUtil,
    ValidatorUtil,
    BrokerTokenUtil,
    CatalogUtil,
  ],
})
export class UtilModule {}
