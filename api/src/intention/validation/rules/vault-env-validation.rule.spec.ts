import { beforeEach, describe, it, expect } from 'vitest';
import { VaultEnvValidationRule } from './vault-env-validation.rule';
import { ActionUtil } from '../../../util/action.util';
import { DecisionContext } from '../decision-context.interface';
import { ActionEmbeddable } from '../../entity/action.embeddable';

describe('VaultEnvValidationRule', () => {
  let rule: VaultEnvValidationRule;
  let actionUtil: ActionUtil;

  beforeEach(() => {
    actionUtil = new ActionUtil();
    rule = new VaultEnvValidationRule(actionUtil);
  });

  function createContext(overrides: Partial<DecisionContext> = {}): DecisionContext {
    const action = {
      provision: [],
      service: { name: 'my-service', environment: 'test' },
    } as unknown as ActionEmbeddable;

    return {
      intention: {} as any,
      action,
      account: null,
      accountBoundProjects: null,
      user: { guid: 'user-1' } as any,
      targetServices: [],
      requireProjectExists: false,
      requireServiceExists: false,
      ...overrides,
    };
  }

  it('should pass when action does not require provisioning', async () => {
    const context = { ...createContext() };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
  });

  it('should pass when vault environment is valid', async () => {
    const action = {
      provision: ['some-provision'],
      service: { name: 'my-service', environment: 'production' },
    } as unknown as ActionEmbeddable;

    const context = { ...createContext(), action };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
  });

  it('should pass when vault environment is explicitly set for invalid service environment', async () => {
    const action = {
      provision: ['some-provision'],
      service: { name: 'my-service', environment: 'invalid-env' },
      vaultEnvironment: 'production',
    } as unknown as ActionEmbeddable;

    const context = { ...createContext(), action };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
  });

  it('should fail when vault environment is invalid and not explicitly set', async () => {
    const action = {
      provision: ['token/self'],
      service: { name: 'my-service', environment: 'invalid-env' },
    } as unknown as ActionEmbeddable;

    const context = { ...createContext(), action };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(false);
    expect(result.key).toBe('service.environment');
  });

  it('should use service.target.environment as key when target is set', async () => {
    const action = {
      provision: ['token/self'],
      service: {
        name: 'my-service',
        environment: 'invalid-env',
        target: { name: 'target-service', environment: 'another-invalid' },
      },
    } as unknown as ActionEmbeddable;

    const context = { ...createContext(), action };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(false);
    expect(result.key).toBe('service.target.environment');
  });

  it('should return rule name', () => {
    expect(rule.getRuleName()).toBe('vault-env-validation');
  });

  it('should return priority 20', () => {
    expect(rule.getPriority()).toBe(20);
  });
});
