# GitHub Sync

NR Broker can synchronize secrets and user roles from Vault to GitHub. Secrets are typically Broker Account tokens used in GitHub Actions. User sync keeps repository collaborator roles in sync with the graph.

For general information about how the collection sync system works, see [Collection Sync Overview](/dev_customize_collection_sync.md).

## How it works

A cron job polls the Redis queues `github-sync-secrets` and `github-sync-users` every 30 seconds. When a repository is enqueued:

1. Broker looks up the repository and checks whether secret sync or user sync is enabled.
2. For **secret sync**, it reads all secrets from `apps/tools/<project>/<service>` in Vault and writes them as GitHub repository secrets.
3. For **user sync**, it reads the `edgeToRoles` configuration from the user collection config, traverses the graph to find users connected via those edges, and updates GitHub collaborator roles accordingly.
4. Sync status is recorded on the repository (`syncSecretsStatus`, `syncUsersStatus`).

> GitHub Secrets have a more restrictive key format than Vault. Ensure that secret keys in Vault also work well as GitHub secret keys.

## Prerequisites

- Your deployment must be configured for GitHub synchronization
- Service must have its SCM URL set
- GitHub repository must be in an organization enabled

## Setup

NR Broker must be configured with a [GitHub App](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps) to enable this feature. See: [Backend Environment Variables](dev_env_vars.md)

Install the [GitHub App](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app) in all repositories associated with services. Grant the app read/write access to repository secrets.

The token used by NR Broker must also be permitted to read secrets from the tools path. It is not recommended to enable access to other service environments.

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

### Configuring edge-to-role mappings

The `edgeToRoles` array on the user collection config maps graph edges to GitHub collaborator roles:

```javascript
db.collectionConfig.updateOne(
  { collection: 'user' },
  {
    $set: {
      edgeToRoles: [
        {
          edge: ['maintainer'],
          role: 'admin',
          label: 'Maintainer',
          description: 'Full access to the repository',
          url: 'https://github.com',
        },
        {
          edge: ['developer'],
          role: 'write',
          label: 'Developer',
          description: 'Push access to the repository',
          url: 'https://github.com',
        },
      ],
    },
  }
)
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `edge` | string[] | Yes | Graph edge names that map to this role |
| `role` | string | Yes | GitHub collaborator role (`admin`, `maintain`, `write`, `read`, `triage`) |
| `label` | string | Yes | Display name for the role |
| `description` | string | Yes | Description shown in the UI |
| `url` | string | Yes | URL associated with the role |

## Monitoring sync status

The `syncSecretsStatus` and `syncUsersStatus` fields on the Repository record track:

- `queuedAt` — when the job was last enqueued
- `syncAt` — when the last sync completed successfully

These are visible in the NR Broker UI on the Repository detail page (requires `sudo` access).

Sync activity is recorded in the audit log with the `tools.sync` dataset. See: [Understanding the Audit Log](/operations_audit.md)
