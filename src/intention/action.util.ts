import { Injectable } from '@nestjs/common';
import { VAULT_ENVIRONMENTS, VAULT_PROVISIONED_ACTION_SET } from '../constants';
import { ActionDto } from './dto/action.dto';

@Injectable()
export class ActionUtil {
  public resolveVaultEnvironment(action: ActionDto): string | undefined {
    return action.vaultEnvironment ?? action.service.environment;
  }

  public isValidVaultEnvironment(action: ActionDto): boolean {
    return (
      VAULT_ENVIRONMENTS.indexOf(this.resolveVaultEnvironment(action)) != -1
    );
  }

  public isProvisioned(action: ActionDto): boolean {
    return action.provision.reduce((pv, cv) => {
      return pv || VAULT_PROVISIONED_ACTION_SET.has(cv);
    }, false);
  }
}
