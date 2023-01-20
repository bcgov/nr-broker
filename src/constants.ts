export const AWS_REGION = 'ca-central-1';
export const AWS_KINESIS_BUFFER_TIME = 100;
export const AWS_KINESIS_MAX_RECORDS = 10;

export const TOKEN_RENEW_RATIO = 0.75;

export const HEADER_VAULT_ROLE_ID = 'x-vault-role-id';
export const HEADER_BROKER_TOKEN = 'x-broker-token';

export const TOKEN_SERVICE_WRAP_TTL = 60;

export const INTENTION_DEFAULT_TTL_SECONDS = 300;
export const INTENTION_MIN_TTL_SECONDS = 30;
export const INTENTION_MAX_TTL_SECONDS = 1200;

export const SHORT_ENV_CONVERSION = {
  production: 'prod',
  development: 'dev',
};

export const ACTION_PROVISION_TOKEN_SELF = 'token/self';
export const ACTION_PROVISION_APPROLE_SECRET_ID = 'approle/secret-id';
export const VAULT_PROVISIONED_ACTION_SET = new Set([
  ACTION_PROVISION_TOKEN_SELF,
  ACTION_PROVISION_APPROLE_SECRET_ID,
]);

export const IS_PRIMARY_NODE = process.env.HOSTNAME === 'nr-broker-app-0';

export const VAULT_AUDIT_DEVICE_NAME = 'file';
export const VAULT_ENVIRONMENTS = ['production', 'test', 'development'];
export const VAULT_SYNC_APP_AUTH_MOUNT = 'vs_apps_approle';

export const JWT_MAX_AGE = '90d';
