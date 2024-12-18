# Backend Environment Variables

The Broker backend is configured using environment variables.

A suggested deployment strategy is to use [envconsul](https://github.com/hashicorp/envconsul) to populate the secrets. To avoid overloading the [Broker Token](/dev_broker_token.md) with access to paths to retrieve secrets related to OIDC, JWT, Kinesis, MongoDB and more, a recommended pattern is to start envconsul using a token with access to fetch the Broker Token and all other secrets from Vault.

## Deployment Info

| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| APP_ENVIRONMENT |  |  | The name of the environment this instance is running in. A local environment should be blank. Required to push audit to AWS. |
| BROKER_URL |  |  | The external URL that this instance is running on. Used to create redirect urls. |
| HOSTNAME |  |  | The hostname of the server this instance is running on. Used in logs. The instance with a hostname ending in '-0' is the primary node. It will cause issues if there is no primary node or there are multiple primary nodes'. |

## Audit file logging

The audit is written to disk and rotated automatically as a backup to sending it to a Kinesis endpoint.

| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| AUDIT_LOGSTREAM_DIR | '/tmp' |  | Directory to write logs to |
| AUDIT_LOGSTREAM_SIZE | '50M' |  | Maximum size of each log files |
| AUDIT_LOGSTREAM_MAX_LOGS | 7 |  | Maximum number of logs to keep |

## Hashicorp Vault Setup

Hashicorp Vault values used to integrate with the external Vault instance.

See: [Broker Token](/dev_broker_token.md)

| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| BROKER_TOKEN |  | Yes | The vault token this instance uses to authenticate all Vault API calls with. Broker will renew this token automatically. |
| VAULT_ADDR |  |  | The Vault address |
| VAULT_APPROLE_PATH | vs_apps_approle |  | The approle endpoint containing all approles this instance is a broker for. |

## JWT Setup

| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| JWT_SKIP_VALIDATION | false |  | Skips validating if token is in allowed or blocked list. If true, allows any valid token generated using secret to work. Token generation API adds all tokens to an allow list which blocks any token not generated through it. |
| JWT_SECRET |  | Yes | The JWT secret used to create and validate all tokens |

## OAUTH Client Setup

OAUTH Client setup used to integrate as an OAUTH client.

| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| OAUTH2_CLIENT_SESSION_SECRET |  | Yes |  |
| OAUTH2_CLIENT_PROVIDER_OIDC_ISSUER |  |  |  |
| OAUTH2_CLIENT_REGISTRATION_LOGIN_CLIENT_ID |  |  |  |
| OAUTH2_CLIENT_REGISTRATION_LOGIN_CLIENT_SECRET |  | Yes |  |
| OAUTH2_CLIENT_REGISTRATION_LOGIN_REDIRECT_URI |  |  |  |
| OAUTH2_CLIENT_REGISTRATION_LOGIN_SCOPE |  |  |  |

## OAUTH Token Mapping

Broker expects to read various values from the user's OAUTH Token. These let you configure where the values are read from. If a value is blank in the Broker database then it may be reading it from the wrong location.

| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| OAUTH2_CLIENT_MAP_DOMAIN | '' |  | The auth domain |
| OAUTH2_CLIENT_DOMAIN | 'idp' |  | Backup value for domain. Used if mapped value is not present. |
| OAUTH2_CLIENT_MAP_EMAIL | 'email' |  | The user's email address |
| OAUTH2_CLIENT_MAP_GUID | 'idir_user_guid' |  | The user's GUID |
| OAUTH2_CLIENT_MAP_NAME | 'display_name' |  | The user's display name |
| OAUTH2_CLIENT_MAP_ROLES | 'client_roles' |  | The client roles the user has. |
| OAUTH2_CLIENT_MAP_USERNAME | 'idir_username' |  | The user's username |

## AWS Kinesis

AWS configuration used to push the audit log to a Kinesis end point. Consuming the data from the Kinesis endpoint is deployment specific.

| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| AWS_ACCESS_KEY_ID |  | Yes |  |
| AWS_SECRET_ACCESS_KEY |  | Yes |  |
| AWS_ROLE_ARN |  | Yes |  |
| AWS_DEFAULT_REGION | ca-central-1 |  |  |

## Log redirection

The logs are normally split into different datasets by the field `event.dataset`. See: [Understanding the Audit Log](/audit.md)

If you are testing, the `@metadata.index` field can be used by what processes the logs to override the destination index. Log processing is deployment specific.

| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| BROKER_AUDIT_INDEX_BROKER_AUDIT |  |  | Set field `@metadata.index` to this value in all `broker.audit` dataset documents. |
| BROKER_AUDIT_INDEX_HTTP_ACCESS |  |  | Set field `@metadata.index` to this value in all `generic.access` dataset documents. |

## Helmet Configuration

https://helmetjs.github.io

Broker, by default, uses Helmet's default content security policy directives.

| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| NESTJS_HELMET_HSTS |  |  | If HSTS (HTTP Strict Transport Security) is set to 'off', insecure requests are not upgraded. This option is primarily for local development. This deletes 'upgrade-insecure-requests' from the policy directives. |

## MongoDB Connection

The MongoDB environment variables used to setup the connection.


| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| MONGODB_URL |  |  | The MongoDB URL that can be paramaterized as described in username and password environment variables. |
| MONGODB_USERNAME |  | Yes | The username to substitute for the text '{{username}}' in MONGODB_URL. |
| MONGODB_PASSWORD |  | Yes | The password to substitute for the text '{{password}}' in MONGODB_URL. |

## OpenSearch Integration

The OpenSearch environment variables used to integrate with it.

| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| OPENSEARCH_INDEX_BROKER_AUDIT |  |  | The OpenSearch index pattern containing the forwarded audit logs. |

## Redis

The Redis environment variables used to setup the connection.

| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| REDIS_HOST | 'localhost' |  | The Redis server host |
| REDIS_PORT | 6379 |  | The Redis server port |
| REDIS_USER | '' | Yes | The Redis user |
| REDIS_PASSWORD | '' | Yes | The Redis password |

## User Alias Services

### GitHub

| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| GITHUB_OAUTH_CLIENT_ID |  |  | The client id of the GitHub OAuth App |
| GITHUB_OAUTH_CLIENT_SECRET |  |  |  The client secret of the GitHub OAuth App |

## Sync Services

### GitHub

| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| GITHUB_SYNC_CLIENT_ID |  |  | The client id of the GitHub App |
| GITHUB_SYNC_PRIVATE_KEY |  |  | The private key of the GitHub App |

## Temporary

| Env Var | Default | Secret | Description |
| --- | --- | --- | --- |
| ACTION_VALIDATE_TEAM_ADMIN |  |  | Users that are members of this team can skip all intention validations.  |
| ACTION_VALIDATE_TEAM_DBA |  |  | Users that are members of this team can skip database intention validations. |