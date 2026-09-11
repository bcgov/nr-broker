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

export const GRAPH_MAX_UPSTREAM_LOOKUP_DEPTH = 4;
export const GRAPH_MAX_DOWNSTREAM_LOOKUP_DEPTH = 4;
export const GRAPH_MAX_BROKER_SERVICE_LOOKUP_DEPTH = 2;
export const GRAPH_MAX_PROJECT_SERVICE_LOOKUP_DEPTH = 2;
export const COLLECTION_MAX_EMBEDDED = 40;
export const COLLECTION_COLLATION_LOCALE = 'en';

export const INTENTION_DEFAULT_TTL_SECONDS = 600;
export const INTENTION_MIN_TTL_SECONDS = 30;
export const INTENTION_MAX_TTL_SECONDS = 1800;
export const INTENTION_TRANSIENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INTENTION_REJECTED_TTL_MS = 1 * 24 * 60 * 60 * 1000;

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
export const VAULT_KV_CLOUDS_MOUNT = 'clouds';
export const VAULT_KV_APPS_TOOLS_PATH_TPL =
  process.env.VAULT_KV_APPS_TOOLS_PATH_TPL ??
  'tools/<%= projectName %>/<%= serviceName %>';
export const VAULT_SYNC_APP_AUTH_MOUNT =
  process.env.VAULT_APPROLE_PATH ?? 'vs_apps_approle';
export const VAULT_APPROLE_META_ACTIONS = {
  GENERATE_SECRET_ID: 'generate-secret-id',
  GENERATE_TOKEN: 'generate-token',
} as const;

export const JWT_MAX_AGE = '365d';
export const JWT_GENERATE_BLOCK_GRACE_PERIOD = 60000;

export const MILLISECONDS_IN_SECOND = 1000;
export const DAYS_10_IN_SECONDS = 60 * 60 * 24 * 10;
export const MINUTE_IN_SECONDS = 60;

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

/**
 * BullMQ data queue names.
 *
 * The identifiers are the keys understood by `QUEUE_PROCESSING`, so a process
 * can be pointed at a single queue with `QUEUE_PROCESSING=notification-coms`.
 * `REDIS_QUEUES` is re-exported as an alias for backward compatibility with the
 * existing consumer/producer call sites.
 */
export const REDIS_QUEUES = {
  GITHUB_SYNC_SECRETS: 'github-sync-secrets',
  GITHUB_SYNC_USERS: 'github-sync-users',
  KUBERNETES_SYNC_SECRETS: 'kubernetes-sync-secrets',
  NOTIFICATION_COMS: 'notification-coms',
  VAULT_SECRET_IDS: 'vault-secret-ids',
} as const;

export type BullQueueName =
  (typeof REDIS_QUEUES)[keyof typeof REDIS_QUEUES];

/**
 * BullMQ leader job names.
 *
 * Single-node scheduled jobs are BullMQ *repeatable* jobs. BullMQ's repeat
 * mechanism guarantees exactly one job fires per schedule tick across all
 * replicas and the standalone worker, replacing the static leader election.
 */
export const BULL_LEADER_JOBS = {
  INTENTION_EXPIRY: 'intention-expiry',
  TRANSIENT_CLEANUP: 'transient-cleanup',
  REJECTED_CLEANUP: 'rejected-cleanup',
  JWT_LIFECYCLE: 'jwt-lifecycle',
  JWT_EXPIRATION_NOTIFICATION: 'jwt-expiration-notification',
  SEND_JWT_EXPIRATION_NOTIFICATION: 'send-jwt-expiration-notification',
  COLLECTION_SYNC: 'collection-sync',
  TOKEN_RENEWAL: 'token-renewal',
} as const;

export type BullLeaderJobName =
  (typeof BULL_LEADER_JOBS)[keyof typeof BULL_LEADER_JOBS];

// Label applied to Kubernetes secrets created or updated by the sync service,
// so they can be identified as originating from NR Broker.
export const KUBERNETES_SYNC_SECRET_LABEL_KEY = 'nr-broker.io/managed-by';
export const KUBERNETES_SYNC_SECRET_LABEL_VALUE = 'nr-broker';

export const REDIS_PUBSUB = {
  GRAPH: 'graph',
  BROKER_ACCOUNT_TOKEN: 'broker-account-token',
} as const;

/**
 * Controls which BullMQ data queues this API process consumes.
 *
 * `QUEUE_PROCESSING` is a comma-separated list of queue identifiers. Each
 * identifier is either one of the `REDIS_QUEUES` values (e.g.
 * `github-sync-secrets`, `github-sync-users`, `kubernetes-sync-secrets`,
 * `notification-coms`) or the literal `all`.
 *
 * - Unset or `all` (the default): every replica consumes every queue.
 * - A single identifier (e.g. `notification-coms`): only that queue is
 *   consumed. Use this to run a dedicated worker process that processes one
 *   queue, improving responsiveness for that queue by removing contention.
 * - Empty or a value listing no enabled queue: no queue is consumed by this
 *   process.
 *
 * This enables independent scaling: run separate processes, each with
 * `QUEUE_PROCESSING` set to a distinct queue, so a busy queue can be given its
 * own consumer without competing with the others. BullMQ workers are still
 * mutually exclusive per queue (a job is claimed by exactly one consumer), so
 * overlapping a queue across processes is safe.
 */
export const QUEUE_PROCESSING = process.env.QUEUE_PROCESSING ?? 'all';

/**
 * Default concurrency for BullMQ data-queue workers. Each consumer service
 * registers its worker with this number of parallel slots
 */
export const BULL_WORKER_CONCURRENCY =
  Number(process.env.BULL_WORKER_CONCURRENCY) || 1;

/**
 * How long a claimed BullMQ data-queue job may stay in the active state before
 * it is considered stalled and re-processed. Sync jobs can run for a while
 * (Vault + network round trips), so this is generous; keep it above the
 * longest expected job runtime.
 */
export const BULL_STALLED_INTERVAL_MS =
  Number(process.env.BULL_STALLED_INTERVAL_MS) || 60000;

/**
 * Connection details for the BullMQ Redis connection. Mirrors the env vars the
 * persistence `REDIS_CLIENT` factory reads (`REDIS_HOST`/`REDIS_PORT`/
 * `REDIS_USER`/`REDIS_PASSWORD`/`REDIS_REPLICAS`) so both clients point at the
 * same Redis. BullMQ needs its own ioredis instance, so it is created here
 * rather than reused from `RedisService`.
 */
export const BULL_REDIS = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  username: process.env.REDIS_USER ?? undefined,
  password: process.env.REDIS_PASSWORD ?? undefined,
  // `REDIS_REPLICAS` names the replica nodes; when set, BullMQ talks to the
  // cluster directly via ioredis `nodes`.
  replicas: process.env.REDIS_REPLICAS ?? undefined,
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

export const NOTIFICATION_EMAIL_FROM =
  process.env.NOTIFICATION_EMAIL_FROM ?? '';
export const NOTIFICATION_EMAIL_HOST =
  process.env.NOTIFICATION_EMAIL_HOST ?? '';
export const NOTIFICATION_EMAIL_PORT =
  process.env.NOTIFICATION_EMAIL_PORT ?? '';
export const NOTIFICATION_EMAIL_SECURE =
  process.env.NOTIFICATION_EMAIL_SECURE === 'true';

export const FEATURE_FLAG_GITHUB_ENVIRONMENT_SYNC =
  process.env.FEATURE_FLAG_GITHUB_ENVIRONMENT_SYNC === 'true';

// SSE heartbeat interval in milliseconds. Set to a value under 5000 to disable.
export const SSE_HEARTBEAT_INTERVAL_MS =
  Number.parseInt(process.env.SSE_HEARTBEAT_INTERVAL_MS ?? '15000', 10);
