import { beforeEach, describe, it, expect } from 'vitest';
import { JwtBlockedValidationRule } from './jwt-blocked-validation.rule';
import { IntentionDecisionContext } from '../intention-decision-context.interface';

describe('JwtBlockedValidationRule', () => {
  let rule: JwtBlockedValidationRule;

  beforeEach(() => {
    rule = new JwtBlockedValidationRule();
  });

  function createContext(overrides: Partial<IntentionDecisionContext> = {}): IntentionDecisionContext {
    return {
      brokerJwt: { jti: 'jwt-1' } as any,
      registryJwt: null,
      account: null,
      ...overrides,
    };
  }

  it('should pass when registryJwt is null', async () => {
    const context = { ...createContext() };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
  });

  it('should pass when registryJwt exists but is not blocked', async () => {
    const context = {
      ...createContext(),
      registryJwt: { jti: 'jwt-1', blocked: false } as any,
    };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
  });

  it('should fail when registryJwt is blocked', async () => {
    const context = {
      ...createContext(),
      registryJwt: { jti: 'jwt-1', blocked: true } as any,
    };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(false);
    expect(result.message).toBe('Authorization failed');
    expect(result.key).toBe('jwt.jti');
    expect(result.data).toEqual([]);
  });

  it('should return rule name', () => {
    expect(rule.getRuleName()).toBe('jwt-blocked-validation');
  });

  it('should return priority 10', () => {
    expect(rule.getPriority()).toBe(10);
  });
});
