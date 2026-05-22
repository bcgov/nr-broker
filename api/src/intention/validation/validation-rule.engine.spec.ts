import { beforeEach, describe, it, expect, vi } from 'vitest';
import { ValidationRuleEngine } from './validation-rule.engine';
import { DecisionContext } from './decision-context.interface';
import { ValidationRule } from './validation-rule.interface';

describe('ValidationRuleEngine', () => {
  let engine: ValidationRuleEngine;
  let mockRules: ValidationRule[];

  beforeEach(() => {
    mockRules = [
      {
        getRuleName: () => 'rule-1',
        getPriority: () => 10,
        evaluate: vi.fn(),
      },
      {
        getRuleName: () => 'rule-2',
        getPriority: () => 20,
        evaluate: vi.fn(),
      },
      {
        getRuleName: () => 'rule-3',
        getPriority: () => 30,
        evaluate: vi.fn(),
      },
      {
        getRuleName: () => 'rule-4',
        getPriority: () => 40,
        evaluate: vi.fn(),
      },
      {
        getRuleName: () => 'rule-5',
        getPriority: () => 50,
        evaluate: vi.fn(),
      },
      {
        getRuleName: () => 'rule-6',
        getPriority: () => 60,
        evaluate: vi.fn(),
      },
      {
        getRuleName: () => 'rule-7',
        getPriority: () => 70,
        evaluate: vi.fn(),
      },
      {
        getRuleName: () => 'rule-8',
        getPriority: () => 80,
        evaluate: vi.fn(),
      },
    ];

    engine = new ValidationRuleEngine(
      mockRules[0] as any,
      mockRules[1] as any,
      mockRules[2] as any,
      mockRules[3] as any,
      mockRules[4] as any,
      mockRules[5] as any,
      mockRules[6] as any,
      mockRules[7] as any,
    );
  });

  function createContext(): DecisionContext {
    return {
      intention: {} as any,
      action: {} as any,
      account: null,
      accountBoundProjects: null,
      user: null,
      targetServices: [],
      requireProjectExists: false,
      requireServiceExists: false,
    };
  }

  it('should return all rules sorted by priority', () => {
    const rules = engine.getRules();
    expect(rules.length).toBe(8);
    expect(rules[0].getRuleName()).toBe('rule-1');
    expect(rules[1].getRuleName()).toBe('rule-2');
    expect(rules[2].getRuleName()).toBe('rule-3');
    expect(rules[3].getRuleName()).toBe('rule-4');
  });

  it('should pass when all rules pass', async () => {
    mockRules.forEach((rule) => {
      vi.mocked(rule.evaluate).mockResolvedValue({ valid: true });
    });

    const context = createContext();
    const result = await engine.validate(context);

    expect(result).toBeNull();
    mockRules.forEach((rule) => {
      expect(rule.evaluate).toHaveBeenCalledWith(context);
    });
  });

  it('should fail on first rule that fails', async () => {
    vi.mocked(mockRules[0].evaluate).mockResolvedValue({
      valid: false,
      message: 'First rule failed',
      key: 'field-1',
    });
    for (let idx = 1; idx < mockRules.length; idx += 1) {
      vi.mocked(mockRules[idx].evaluate).mockResolvedValue({
        valid: true,
      });
    }

    const context = createContext();
    const result = await engine.validate(context);

    expect(result).not.toBeNull();
    expect(result?.message).toBe('First rule failed');
    expect(result?.key).toBe('field-1');
    expect(mockRules[1].evaluate).not.toHaveBeenCalled();
  });

  it('should handle rule without getPriority method', async () => {
    const noPriorityRule = {
      getRuleName: () => 'no-priority-rule',
      evaluate: vi.fn().mockResolvedValue({ valid: true }),
    };

    const engineNoPriority = new ValidationRuleEngine(
      mockRules[0] as any,
      mockRules[1] as any,
      mockRules[2] as any,
      mockRules[3] as any,
      mockRules[4] as any,
      mockRules[5] as any,
      mockRules[6] as any,
      noPriorityRule as any,
    );

    mockRules.forEach((rule) => {
      vi.mocked(rule.evaluate).mockResolvedValue({ valid: true });
    });

    const context = createContext();
    const result = await engineNoPriority.validate(context);

    expect(result).toBeNull();
    expect(noPriorityRule.evaluate).toHaveBeenCalledWith(context);
  });
});
