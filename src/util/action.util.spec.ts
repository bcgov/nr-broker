import { ActionUtil } from './action.util';
import { ActionEmbeddable } from '../intention/entity/action.embeddable';
import {
  ACTION_PROVISION_APPROLE_SECRET_ID,
  ACTION_PROVISION_TOKEN_SELF,
} from '../intention/dto/constants.dto';

describe('ActionUtil', () => {
  let util: ActionUtil;

  beforeEach(async () => {
    util = new ActionUtil();
  });

  it('resolveVaultEnvironment to return the correct environment', () => {
    expect(
      util.resolveVaultEnvironment({
        service: { environment: 'production' },
      } as ActionEmbeddable),
    ).toBe('production');
    expect(
      util.resolveVaultEnvironment({
        vaultEnvironment: 'production',
        service: { environment: 'arrgh' },
      } as ActionEmbeddable),
    ).toBe('production');
  });

  it('isValidVaultEnvironment to detects valid environments', () => {
    expect(
      util.isValidVaultEnvironment({
        service: { environment: 'production' },
      } as ActionEmbeddable),
    ).toBe(true);
    expect(
      util.isValidVaultEnvironment({
        service: { environment: 'test' },
      } as ActionEmbeddable),
    ).toBe(true);
    expect(
      util.isValidVaultEnvironment({
        service: { environment: 'development' },
      } as ActionEmbeddable),
    ).toBe(true);
    expect(
      util.isValidVaultEnvironment({
        service: { environment: 'arrgh' },
      } as ActionEmbeddable),
    ).toBe(false);
    expect(
      util.isValidVaultEnvironment({
        vaultEnvironment: 'production',
        service: { environment: 'arrgh' },
      } as ActionEmbeddable),
    ).toBe(true);
  });

  it('isProvisioned to detect when an action is provisioned', () => {
    expect(
      util.isProvisioned({
        provision: [],
      } as ActionEmbeddable),
    ).toBe(false);
    expect(
      util.isProvisioned({
        provision: ['something'],
      } as ActionEmbeddable),
    ).toBe(false);
    expect(
      util.isProvisioned({
        provision: [ACTION_PROVISION_TOKEN_SELF],
      } as ActionEmbeddable),
    ).toBe(true);
    expect(
      util.isProvisioned({
        provision: [ACTION_PROVISION_APPROLE_SECRET_ID],
      } as ActionEmbeddable),
    ).toBe(true);
  });

  it('parseVersion to parse a correct version number', () => {
    expect(util.parseVersion('2.1.3-snapshot+build46')).toEqual({
      major: '2',
      minor: '1',
      patch: '3',
      prerelease: 'snapshot',
      build: 'build46',
    });
  });
});
