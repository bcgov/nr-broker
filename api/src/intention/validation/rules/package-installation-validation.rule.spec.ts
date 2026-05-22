import { beforeEach, describe, it, expect, vi } from 'vitest';
import { PackageInstallationValidationRule } from './package-installation-validation.rule';
import { ActionUtil } from '../../../util/action.util';
import { PersistenceUtilService } from '../../../persistence/persistence-util.service';
import { AssistedDeliveryValidationRule } from './assisted-delivery-validation.rule';
import { PackageInstallationActionEmbeddable } from '../../entity/package-installation-action.embeddable';
import { DecisionContext } from '../decision-context.interface';
import { ENVIRONMENT_NAMES } from '../../dto/constants.dto';

describe('PackageInstallationValidationRule', () => {
  let rule: PackageInstallationValidationRule;
  let actionUtil: ActionUtil;
  let persistenceUtil: PersistenceUtilService;
  let assistedDeliveryRule: AssistedDeliveryValidationRule;

  beforeEach(() => {
    actionUtil = new ActionUtil();
    persistenceUtil = {
      getEnvMap: vi.fn(),
    } as unknown as PersistenceUtilService;
    assistedDeliveryRule = {
      evaluate: vi.fn(),
    } as unknown as AssistedDeliveryValidationRule;

    rule = new PackageInstallationValidationRule(
      actionUtil,
      persistenceUtil,
      assistedDeliveryRule,
    );
  });

  function createContext(overrides: Partial<DecisionContext> = {}): DecisionContext {
    const action = Object.assign(
      Object.create(PackageInstallationActionEmbeddable.prototype),
      {
        package: { name: 'my-package', version: '1.0.0' },
        service: {
          name: 'my-service',
          environment: 'test',
          instanceName: 'my-instance',
        },
      },
    ) as PackageInstallationActionEmbeddable;

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

  it('should pass when action is not a PackageInstallationAction', async () => {
    const action = { package: { name: 'x' } } as any;
    const context = {
      ...createContext(),
      action,
    };

    const result = await rule.evaluate(context);
    expect(result.valid).toBe(true);
  });

  it('should fail when environment is invalid', async () => {
    vi.mocked(persistenceUtil.getEnvMap).mockResolvedValue({});

    const context = { ...createContext() };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(false);
    expect(result.message).toBe('Package installation must specify a valid environment.');
    expect(result.key).toBe('service.environment');
  });

  it('should pass when environment is valid', async () => {
    vi.mocked(persistenceUtil.getEnvMap).mockResolvedValue({
      test: { name: 'test' } as any,
    });

    vi.mocked(assistedDeliveryRule.evaluate).mockResolvedValue({ valid: true });

    const context = { ...createContext() };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
  });

  it('should pass when instanceName is resolved from fallback service path', async () => {
    vi.mocked(persistenceUtil.getEnvMap).mockResolvedValue({
      test: { name: 'test' } as any,
    });
    vi.mocked(assistedDeliveryRule.evaluate).mockResolvedValue({ valid: true });

    const action = Object.assign(
      Object.create(PackageInstallationActionEmbeddable.prototype),
      {
        package: { name: 'my-package', version: '1.0.0' },
        service: { name: 'my-service', environment: 'test' },
      },
    ) as PackageInstallationActionEmbeddable;

    const context = { ...createContext(), action };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
  });

  it('should fail when semver is invalid and not masked', async () => {
    vi.mocked(persistenceUtil.getEnvMap).mockResolvedValue({
      test: { name: 'test' } as any,
    });

    const action = Object.assign(
      Object.create(PackageInstallationActionEmbeddable.prototype),
      {
        package: { name: 'my-package', version: 'not-a-version' },
        service: {
          name: 'my-service',
          environment: 'test',
          instanceName: 'my-instance',
        },
      },
    ) as PackageInstallationActionEmbeddable;

    const context = { ...createContext(), action };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(false);
  });

  it('should pass when semver is invalid but maskSemverFailures is enabled', async () => {
    vi.mocked(persistenceUtil.getEnvMap).mockResolvedValue({
      test: { name: 'test' } as any,
    });

    const action = Object.assign(
      Object.create(PackageInstallationActionEmbeddable.prototype),
      {
        package: { name: 'my-package', version: 'not-a-version' },
        service: {
          name: 'my-service',
          environment: 'test',
          instanceName: 'my-instance',
        },
      },
    ) as PackageInstallationActionEmbeddable;

    vi.mocked(assistedDeliveryRule.evaluate).mockResolvedValue({ valid: true });

    const context = {
      ...createContext(),
      action,
      account: { maskSemverFailures: true } as any,
    };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
  });

  it('should fail when installing prerelease to production', async () => {
    vi.mocked(persistenceUtil.getEnvMap).mockResolvedValue({
      production: { name: ENVIRONMENT_NAMES.PRODUCTION } as any,
    });

    const action = Object.assign(
      Object.create(PackageInstallationActionEmbeddable.prototype),
      {
        package: { name: 'my-package', version: '1.0.0-alpha' },
        service: {
          name: 'my-service',
          environment: 'production',
          instanceName: 'my-instance',
        },
      },
    ) as PackageInstallationActionEmbeddable;

    const context = { ...createContext(), action };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(false);
    expect(result.key).toBe('package.version');
  });

  it('should pass when installing release to production', async () => {
    vi.mocked(persistenceUtil.getEnvMap).mockResolvedValue({
      production: { name: ENVIRONMENT_NAMES.PRODUCTION } as any,
    });

    const action = Object.assign(
      Object.create(PackageInstallationActionEmbeddable.prototype),
      {
        package: { name: 'my-package', version: '1.0.0' },
        service: {
          name: 'my-service',
          environment: 'production',
          instanceName: 'my-instance',
        },
      },
    ) as PackageInstallationActionEmbeddable;

    vi.mocked(assistedDeliveryRule.evaluate).mockResolvedValue({ valid: true });

    const context = { ...createContext(), action };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
  });

  it('should skip assisted delivery check when skipUserValidation is true', async () => {
    vi.mocked(persistenceUtil.getEnvMap).mockResolvedValue({
      test: { name: 'test' } as any,
    });

    const context = {
      ...createContext(),
      account: { skipUserValidation: true } as any,
    };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
    expect(assistedDeliveryRule.evaluate).not.toHaveBeenCalled();
  });

  it('should delegate to assisted delivery rule when user validation is required', async () => {
    vi.mocked(persistenceUtil.getEnvMap).mockResolvedValue({
      test: { name: 'test' } as any,
    });

    vi.mocked(assistedDeliveryRule.evaluate).mockResolvedValue({ valid: true });

    const context = { ...createContext() };
    const result = await rule.evaluate(context);

    expect(result.valid).toBe(true);
    expect(assistedDeliveryRule.evaluate).toHaveBeenCalledWith(context);
  });

  it('should return rule name', () => {
    expect(rule.getRuleName()).toBe('package-installation-validation');
  });

  it('should return priority 70', () => {
    expect(rule.getPriority()).toBe(70);
  });
});
