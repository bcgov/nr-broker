import {
  Body,
  Controller,
  ParseBoolPipe,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { AccountPermission } from '../account-permission.decorator';
import { BrokerCombinedAuthGuard } from '../auth/broker-combined-auth.guard';
import { Roles } from '../roles.decorator';
import { OnboardingManifestDto } from './dto/onboarding-manifest.dto';
import { OnboardingPlanDto } from './dto/onboarding-plan.dto';
import { OnboardingService } from './onboarding.service';

/**
 * Self-service onboarding of a new application: project, service, instances,
 * repository, Vault/AppRole and provision-token connections.
 *
 * Callable with an admin session, or with a broker account token whose
 * account has `enableOnboarding` set (same pattern as user import).
 */
@Controller({
  path: 'onboarding',
  version: '1',
})
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  @UseGuards(BrokerCombinedAuthGuard)
  @Roles('admin')
  @AccountPermission('enableOnboarding')
  @ApiBearerAuth()
  @ApiQuery({
    name: 'apply',
    required: false,
    description: 'Omit (or false) for a dry run that only returns the plan.',
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  onboard(
    @Request() req: ExpressRequest,
    @Body() manifest: OnboardingManifestDto,
    @Query('apply', new ParseBoolPipe({ optional: true })) apply?: boolean,
  ): Promise<OnboardingPlanDto> {
    return this.onboardingService.onboard(req, manifest, apply === true);
  }
}
