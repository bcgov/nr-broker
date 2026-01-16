import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CollectionModule } from '../collection/collection.module';
import { GraphModule } from '../graph/graph.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { UtilModule } from '../util/util.module';
import { IntentionController } from './intention.controller';
import { IntentionService } from './intention.service';
import { ActionService } from './action.service';
import { ActionUtil } from '../util/action.util';
import { IntentionUtilService } from './intention-util.service';
import { ValidationRuleEngine } from './validation/validation-rule.engine';
import {
  UserSetValidationRule,
  VaultEnvValidationRule,
  AccountBoundProjectValidationRule,
  TargetServiceValidationRule,
  DatabaseAccessValidationRule,
  PackageBuildValidationRule,
  EnvironmentPromotionValidationRule,
  PackageInstallationValidationRule,
  AssistedDeliveryValidationRule,
} from './validation/rules';
import { IntentionValidationRuleEngine } from './validation/intention-validation-rule.engine';
import {
  JwtBlockedValidationRule,
  AccountBindingValidationRule,
} from './validation/intention-rules';

/**
 * The intention module allows broker accounts to interact with intentions.
 */
@Module({
  imports: [
    AuthModule,
    AuditModule,
    forwardRef(() => CollectionModule),
    GraphModule,
    PersistenceModule,
    UtilModule,
  ],
  controllers: [IntentionController],
  providers: [
    IntentionService,
    ActionService,
    ActionUtil,
    IntentionUtilService,
    // Action Validation Rule Engine and Rules
    ValidationRuleEngine,
    UserSetValidationRule,
    VaultEnvValidationRule,
    AccountBoundProjectValidationRule,
    TargetServiceValidationRule,
    DatabaseAccessValidationRule,
    PackageBuildValidationRule,
    EnvironmentPromotionValidationRule,
    PackageInstallationValidationRule,
    AssistedDeliveryValidationRule,
    // Intention Validation Rule Engine and Rules
    IntentionValidationRuleEngine,
    JwtBlockedValidationRule,
    AccountBindingValidationRule,
  ],
  exports: [ActionUtil, ActionService, IntentionService, IntentionUtilService],
})
export class IntentionModule {}
