# GitHub Sync

NR Broker can synchronize secrets and user roles from Vault to GitHub. Secrets are typically Broker Account tokens used in GitHub Actions. User sync keeps repository collaborator roles in sync with the graph.

For general information about how the collection sync system works, see [Collection Sync Overview](/dev_customize_collection_sync.md). For GitHub App deployment and user-sync role setup, see [GitHub Sync Development](/dev_github_sync.md).

## How it works

BullMQ workers consume the `github-sync-secrets` and `github-sync-users` queues when queue processing is enabled. Collection sync requests enqueue repository IDs with a five-second debounce and deduplicate repeated requests for the same repository. When a repository is dequeued:

1. Broker looks up the repository and checks whether secret sync or user sync is enabled.
2. For **secret sync**, it reads all secrets from `apps/tools/<project>/<service>` in Vault and writes them as GitHub repository secrets.
3. For **user sync**, it reads the `edgeToRoles` configuration from the user collection config, traverses the graph to find users connected via those edges, and updates GitHub collaborator roles accordingly.
4. Sync status is recorded on the repository (`syncSecretsStatus`, `syncUsersStatus`).

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

On the Repository record, set **Enable secret sync** to `true`. When a token is generated or secrets are manually synchronized, all secrets in the tools namespace for a service (`apps-kv-mount`/tools/`project`/`service`) will be synchronized to the associated repository.

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

The `syncSecretsStatus` and `syncUsersStatus` fields on the Repository record track:

- `queuedAt` — when the job was last enqueued
- `syncAt` — when the last sync completed successfully

These are visible in the NR Broker UI on the Repository detail page (requires `sudo` access).

Sync activity is recorded in the audit log with the `tools.sync` dataset. See: [Understanding the Audit Log](/operations_audit.md)
