export const ACTION_PROVISION_TOKEN_SELF = 'token/self';
export const ACTION_PROVISION_APPROLE_SECRET_ID = 'approle/secret-id';
export const VAULT_PROVISIONED_ACTION_SET = new Set([
  ACTION_PROVISION_TOKEN_SELF,
  ACTION_PROVISION_APPROLE_SECRET_ID,
]);

export enum INTENTION_CLOSE_STATUSES {
  SUCCESS = 'success',
  FAILURE = 'failure',
  UNKNOWN = 'unknown',
}

export enum ACTION_END_STATUSES {
  SUCCESS = 'success',
  FAILURE = 'failure',
  UNKNOWN = 'unknown',
}

export enum ENVIRONMENT_NAMES {
  PRODUCTION = 'production',
  TEST = 'test',
  DEVELOPMENT = 'development',
  TOOLS = 'tools',
}
