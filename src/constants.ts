export const BROKER_URL = process.env.BROKER_URL ?? '';

export const APP_ENVIRONMENT = process.env.APP_ENVIRONMENT ?? '';

export const AWS_REGION = 'ca-central-1';
export const AWS_KINESIS_BUFFER_TIME = 100;
export const AWS_KINESIS_MAX_RECORDS = 10;
export const AWS_OPENSEARCH_HOST = process.env.AWS_OPENSEARCH_HOST ?? '';
export const OPENSEARCH_INDEX_BROKER_AUDIT =
  process.env.OPENSEARCH_INDEX_BROKER_AUDIT ?? '';

export const TOKEN_RENEW_RATIO = 0.75;

export const HEADER_VAULT_ROLE_ID = 'x-vault-role-id';
export const HEADER_BROKER_TOKEN = 'x-broker-token';

export const COLLECTION_MAX_EMBEDDED = 40;
export const COLLECTION_COLLATION_LOCALE = 'en';

export const INTENTION_DEFAULT_TTL_SECONDS = 600;
export const INTENTION_MIN_TTL_SECONDS = 30;
export const INTENTION_MAX_TTL_SECONDS = 1800;
export const INTENTION_TRANSIENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Search paths use last existing path as the value
export const INTENTION_SERVICE_ENVIRONMENT_SEARCH_PATHS = [
  'action.service.environment',
  'action.service.target.environment',
] as const;
export const INTENTION_SERVICE_INSTANCE_SEARCH_PATHS = [
  ...INTENTION_SERVICE_ENVIRONMENT_SEARCH_PATHS,
  'action.service.instanceName',
  'action.service.target.instanceName',
] as const;

export const SHORT_ENV_CONVERSION = {
  production: 'prod',
  development: 'dev',
} as const;

export const ACTION_VALIDATE_TEAM_ADMIN =
  process.env.ACTION_VALIDATE_TEAM_ADMIN ?? '';
export const ACTION_VALIDATE_TEAM_DBA =
  process.env.ACTION_VALIDATE_TEAM_DBA ?? '';

export const IS_PRIMARY_NODE = process.env.HOSTNAME?.endsWith('-0') ?? false;

export const AUDIT_LOGSTREAM_DIR = process.env.AUDIT_LOGSTREAM_DIR ?? '/tmp';
export const AUDIT_LOGSTREAM_SIZE = process.env.AUDIT_LOGSTREAM_SIZE ?? '50M';
export const AUDIT_LOGSTREAM_MAX_LOGS =
  process.env.AUDIT_LOGSTREAM_MAX_LOGS ?? '7';

export const VAULT_ADDR = process.env.VAULT_ADDR ?? '';
export const VAULT_SERVICE_WRAP_TTL = 60;
export const VAULT_AUDIT_DEVICE_NAME = 'file';
export const VAULT_ENVIRONMENTS = Object.freeze([
  'production',
  'test',
  'development',
  'tools',
]);
export const VAULT_ENVIRONMENTS_SHORT = Object.freeze([
  'prod',
  'test',
  'dev',
  'tools',
]);
export const VAULT_KV_APPS_MOUNT = 'apps';
export const VAULT_KV_APPS_TOOLS_PATH_TPL =
  process.env.VAULT_KV_APPS_TOOLS_PATH_TPL ??
  'tools/<%= projectName %>/<%= serviceName %>';
export const VAULT_SYNC_APP_AUTH_MOUNT =
  process.env.VAULT_APPROLE_PATH ?? 'vs_apps_approle';

export const JWT_MAX_AGE = '365d';
export const JWT_GENERATE_BLOCK_GRACE_PERIOD = 60000;

export const MILLISECONDS_IN_SECOND = 1000;
export const DAYS_10_IN_SECONDS = 60 * 60 * 24 * 10;

export const OAUTH2_CLIENT_MAP_DOMAIN =
  process.env.OAUTH2_CLIENT_MAP_DOMAIN ?? '';
export const OAUTH2_CLIENT_DOMAIN = process.env.OAUTH2_CLIENT_DOMAIN ?? 'idp';
export const OAUTH2_CLIENT_MAP_EMAIL =
  process.env.OAUTH2_CLIENT_MAP_EMAIL ?? 'email';
export const OAUTH2_CLIENT_MAP_GUID =
  process.env.OAUTH2_CLIENT_MAP_GUID ?? 'idir_user_guid';
export const OAUTH2_CLIENT_MAP_NAME =
  process.env.OAUTH2_CLIENT_MAP_NAME ?? 'display_name';
export const OAUTH2_CLIENT_MAP_ROLES =
  process.env.OAUTH2_CLIENT_MAP_ROLES ?? 'client_roles';
export const OAUTH2_CLIENT_MAP_USERNAME =
  process.env.OAUTH2_CLIENT_MAP_USERNAME ?? 'idir_username';

export const REDIS_PUBSUB = {
  GRAPH: 'graph',
  BROKER_ACCOUNT_TOKEN: 'broker-account-token',
} as const;

export const GITHUB_OAUTH_CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID ?? '';
export const GITHUB_OAUTH_CLIENT_SECRET =
  process.env.GITHUB_OAUTH_CLIENT_SECRET ?? '';

export const GITHUB_SYNC_CLIENT_ID = process.env.GITHUB_SYNC_CLIENT_ID ?? '';
export const GITHUB_SYNC_PRIVATE_KEY =
  process.env.GITHUB_SYNC_PRIVATE_KEY ?? '';

export const GITHUB_MANAGED_URL_REGEX =
  process.env.GITHUB_MANAGED_URL_REGEX ??
  '^https://github.com/([a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+)$';

export const USER_ALIAS_DOMAIN_GITHUB = 'GitHub';
