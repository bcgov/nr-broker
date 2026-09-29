import { describe, expect, it } from 'vitest';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { BrokerCombinedAuthGuard } from '../auth/broker-combined-auth.guard';
import { ROLES_METADATA_KEY } from '../roles.decorator';
import { OnboardingController } from './onboarding.controller';

/**
 * Access control for onboarding is declared with decorators; these tests fail
 * if any of them is removed or changed.
 */
describe('OnboardingController access control', () => {
  const handler = OnboardingController.prototype.onboard;

  it('requires the combined (token or session) guard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(BrokerCombinedAuthGuard);
  });

  it('limits sessions to admins', () => {
    expect(Reflect.getMetadata(ROLES_METADATA_KEY, handler)).toEqual(['admin']);
  });

  it('limits tokens to accounts with enableOnboarding', () => {
    expect(Reflect.getMetadata('account-permission', handler)).toBe('enableOnboarding');
  });
});
