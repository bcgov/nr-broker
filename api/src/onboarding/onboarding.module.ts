import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GraphModule } from '../graph/graph.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

/**
 * The onboarding module lets a team (or an admin) create the Broker objects a
 * new application needs in one validated, create-only call.
 */
@Module({
  imports: [AuthModule, GraphModule, PersistenceModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
