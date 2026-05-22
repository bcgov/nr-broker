import { beforeEach, describe, it, expect } from 'vitest';
import { TargetServiceValidationRule } from './target-service-validation.rule';
import { DecisionContext } from '../decision-context.interface';
import { ActionEmbeddable } from '../../entity/action.embeddable';

describe('TargetServiceValidationRule', () => {
  let rule: TargetServiceValidationRule;

  beforeEach(() => {
    rule = new TargetServiceValidationRule();
  });

  function createContext(overrides: Partial<DecisionContext> = {}): DecisionContext {
    const action = {
      service: { name: 'my-service' },
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

  it('should pass when action has no target service', async () => {
    const context = { ...createContext() };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
  });

  it('should pass when target service is in the allowed list', async () => {
    const action = {
      service: { name: 'my-service', target: { name: 'target-service' } },
    } as unknown as ActionEmbeddable;

    const context = {
      ...createContext(),
      action,
      targetServices: ['target-service', 'other-service'],
    };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
  });

  it('should fail when target service is not in the allowed list', async () => {
    const action = {
      service: { name: 'my-service', target: { name: 'unauthorized-service' } },
    } as unknown as ActionEmbeddable;

    const context = {
      ...createContext(),
      action,
      targetServices: ['target-service', 'other-service'],
    };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(false);
    expect(result.message).toBe('Service not configured for target');
    expect(result.key).toBe('service.target.name');
  });

  it('should return rule name', () => {
    expect(rule.getRuleName()).toBe('target-service-validation');
  });

  it('should return priority 40', () => {
    expect(rule.getPriority()).toBe(40);
  });
});
