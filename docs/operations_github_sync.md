# GitHub Sync

NR Broker can synchronize secrets and user roles from Vault to GitHub. Secrets are typically Broker Account tokens used in GitHub Actions. User sync keeps repository collaborator roles in sync with the graph.

For general information about how the collection sync system works, see [Collection Sync Overview](/dev_customize_collection_sync.md). For GitHub App deployment and user-sync role setup, see [GitHub Sync Development](/dev_github_sync.md).

## How it works

BullMQ workers consume the `github-sync-secrets`, `github-sync-users` and `github-catalog-scan` queues when queue processing is enabled. Collection sync requests enqueue repository IDs with a five-second debounce and deduplicate repeated requests for the same repository. When a repository is dequeued:

1. Broker looks up the repository and checks whether secret sync or user sync is enabled.
2. For **secret sync**, it reads all secrets from `apps/tools/<project>/<service>` in Vault and writes them as GitHub repository secrets.
3. For **user sync**, it reads the `edgeToRoles` configuration from the user collection config, traverses the graph to find users connected via those edges, and updates GitHub collaborator roles accordingly.
4. For **catalog sync**, it reads `catalog-info.yaml` from the default branch (following root `Location` targets one level) and records the projects, services, service instances and repository links in the graph.
5. Sync status is recorded on the repository (`syncSecretsStatus`, `syncUsersStatus`, `syncCatalogStatus`).

Queue processing runs in the API process unless it is configured as a separate worker. It is queue-driven rather than a fixed-interval cron poll.

> GitHub Secrets have a more restrictive key format than Vault. Ensure that secret keys in Vault also work well as GitHub secret keys.

## Prerequisites

- The deployment must have the GitHub App configured. See [GitHub Sync Development](/dev_github_sync.md).
- The Repository record must have an SCM URL matching `GITHUB_MANAGED_URL_REGEX` (by default, `https://github.com/<owner>/<repository>`).
- The Repository record must have **Enable secret sync** or **Enable user sync** enabled for the corresponding operation.
- The GitHub App must be installed for the repository and have permission to manage repository Actions secrets and collaborators as required by the enabled sync modes.

## Secret sync

Secret sync copies Vault secrets to GitHub repository secrets so they are available in GitHub Actions.

### Enabling secret sync

On the Repository record, set **Enable secret sync** to `true`. When a token is generated or secrets are manually synchronized, all secrets in the tools namespace for a service (`apps`/tools/`project`/`service`) will be synchronized to the associated repository.

## User sync

User sync keeps GitHub repository collaborator roles aligned with the graph. It uses the `edgeToRoles` configuration on the user collection to map graph edges to GitHub roles.

### How user sync works

1. Broker reads `edgeToRoles` from the user collection config, which defines which graph edges map to which GitHub roles (e.g., `admin`, `maintain`, `write`, `read`)
2. For each edge role, it traverses the graph upstream from the repository to find connected users
3. It compares current GitHub collaborators with the expected state and adds or removes collaborators as needed
4. Users in higher roles are skipped when processing lower roles (a user already assigned `admin` will not be downgraded when processing `write`)

### Enabling user sync

On the Repository record, set **Enable user sync** to `true`. User sync will run whenever the repository is enqueued on the `github-sync-users` queue.

## Monitoring sync status

The `syncSecretsStatus`, `syncUsersStatus` and `syncCatalogStatus` fields on the Repository record track:

- `queuedAt` — when the job was last enqueued
- `syncAt` — when the last attempt finished, including failed, partial and skipped attempts
- `state` — `success`, `failure`, `partial` or `skipped`
- `errorCode` — the HTTP status or error code, when available
- `errorMessage` — the reason an attempt failed, partially completed or was skipped

Each finished attempt replaces the previous result. A successful attempt clears old error details. Enqueuing another attempt updates only `queuedAt`, preserving the previous result until that attempt finishes. Older records may have timestamps without a state.

Catalog scans also update existing Repository records found by SCM URL, including scheduled scans. An incomplete catalog scan, a failed entity or relationship, or a skipped instance update records `partial`, not `success`. A missing root catalog file records `skipped`. GitHub access denials and other scan failures record `failure`; the queue worker does not automatically retry handler errors.

User and secret syncs record `partial` when some writes succeed and later writes fail. Repository secret sync status summarizes all services in the queued run so a later successful service cannot hide an earlier failure.

The Repository detail page shows the current sync status and time on one line. Select the status to see any error details from the last attempt. If another sync is queued, the line shows the queued time; previous error details remain available until that attempt finishes.

Sync activity is recorded in the audit log under the `broker.audit` dataset (for example, the `sync-tools`, `sync-graph` and `sync-github-catalog` actions). See: [Understanding the Audit Log](/operations_audit.md)

Terminal messages distinguish completed, partially completed, failed and skipped syncs. Partial attempts use the audit outcome `failure`; skipped attempts use `unknown`. Error codes and messages are included in audit error fields when available.

## Catalog scan

For catalog queue scheduling, discovery, graph behavior and troubleshooting, see [GitHub sync (catalog)](/operations_github_catalog_sync.md). For catalog file schemas, see the [Backstage catalog reference](/backstage-doc/README.md).
