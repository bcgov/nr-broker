import {
  ACTION_PROVISION_APPROLE_SECRET_ID,
  ACTION_PROVISION_TOKEN_SELF,
} from '../constants';
import { ActionUtil } from './action.util';
import { ActionDto } from '../intention/dto/action.dto';

describe('ActionUtil', () => {
  let util: ActionUtil;

  beforeEach(async () => {
    util = new ActionUtil();
  });

  it('resolveVaultEnvironment to return the correct environment', () => {
    expect(
      util.resolveVaultEnvironment({
        service: { environment: 'production' },
      } as ActionDto),
    ).toBe('production');
    expect(
      util.resolveVaultEnvironment({
        vaultEnvironment: 'production',
        service: { environment: 'arrgh' },
      } as ActionDto),
    ).toBe('production');
  });

  it('isValidVaultEnvironment to detects valid environments', () => {
    expect(
      util.isValidVaultEnvironment({
        service: { environment: 'production' },
      } as ActionDto),
    ).toBe(true);
    expect(
      util.isValidVaultEnvironment({
        service: { environment: 'test' },
      } as ActionDto),
    ).toBe(true);
    expect(
      util.isValidVaultEnvironment({
        service: { environment: 'development' },
      } as ActionDto),
    ).toBe(true);
    expect(
      util.isValidVaultEnvironment({
        service: { environment: 'arrgh' },
      } as ActionDto),
    ).toBe(false);
    expect(
      util.isValidVaultEnvironment({
        vaultEnvironment: 'production',
        service: { environment: 'arrgh' },
      } as ActionDto),
    ).toBe(true);
  });

  it('isProvisioned to detect when an action is provisioned', () => {
    expect(
      util.isProvisioned({
        provision: [],
      } as ActionDto),
    ).toBe(false);
    expect(
      util.isProvisioned({
        provision: ['something'],
      } as ActionDto),
    ).toBe(false);
    expect(
      util.isProvisioned({
        provision: [ACTION_PROVISION_TOKEN_SELF],
      } as ActionDto),
    ).toBe(true);
    expect(
      util.isProvisioned({
        provision: [ACTION_PROVISION_APPROLE_SECRET_ID],
      } as ActionDto),
    ).toBe(true);
  });
});
