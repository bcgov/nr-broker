import { beforeEach, describe, it, expect, vi } from 'vitest';
import {
  IntentionValidationException,
  IntentionValidationRuleEngine,
} from './intention-validation-rule.engine';
import { IntentionDecisionContext } from './intention-decision-context.interface';
import { BaseIntentionValidationRule } from './intention-validation-rule.interface';

describe('IntentionValidationRuleEngine', () => {
  let engine: IntentionValidationRuleEngine;
  let firstRule: BaseIntentionValidationRule;
  let secondRule: BaseIntentionValidationRule;

  beforeEach(() => {
    firstRule = {
      getRuleName: () => 'intention-rule-1',
      getPriority: () => 10,
      evaluate: vi.fn(),
    } as any as BaseIntentionValidationRule;

    secondRule = {
      getRuleName: () => 'intention-rule-2',
      getPriority: () => 20,
      evaluate: vi.fn(),
    } as any as BaseIntentionValidationRule;

    engine = new IntentionValidationRuleEngine(
      firstRule as any,
      secondRule as any,
    );
  });

  function createContext(overrides: Partial<IntentionDecisionContext> = {}): IntentionDecisionContext {
    return {
      brokerJwt: { jti: 'jwt-1' } as any,
      registryJwt: null,
      account: null,
      ...overrides,
    };
  }

  it('should return all rules sorted by priority', () => {
    const rules = engine.getRules();
    expect(rules.length).toBe(2);
    expect(rules[0].getRuleName()).toBe('intention-rule-1');
    expect(rules[1].getRuleName()).toBe('intention-rule-2');
  });

  it('should pass when all rules pass', async () => {
    vi.mocked(firstRule.evaluate).mockResolvedValue({ valid: true });
    vi.mocked(secondRule.evaluate).mockResolvedValue({ valid: true });

    const context = createContext();
    const result = await engine.validate(context);

    expect(result).toBeUndefined();
    expect(firstRule.evaluate).toHaveBeenCalledWith(context);
    expect(secondRule.evaluate).toHaveBeenCalledWith(context);
  });

  it('should fail on first rule that fails', async () => {
    vi.mocked(firstRule.evaluate).mockResolvedValue({
      valid: false,
      message: 'First intention rule failed',
      key: 'jwt.jti',
      data: [],
    });
    vi.mocked(secondRule.evaluate).mockResolvedValue({ valid: true });

    const context = createContext();
    await expect(engine.validate(context)).rejects.toBeInstanceOf(
      IntentionValidationException,
    );

    expect(secondRule.evaluate).not.toHaveBeenCalled();
  });

  it('should handle rule without getPriority method', async () => {
    const ruleWithoutPriority = {
      getRuleName: () => 'no-priority',
      evaluate: vi.fn().mockResolvedValue({ valid: true }),
    };

    const engineNoPriority = new IntentionValidationRuleEngine(
      firstRule as any,
      ruleWithoutPriority as any,
    );
    vi.mocked(firstRule.evaluate).mockResolvedValue({ valid: true });

    const context = createContext();
    const result = await engineNoPriority.validate(context);

    expect(result).toBeUndefined();
    expect(ruleWithoutPriority.evaluate).toHaveBeenCalledWith(context);
  });
});
