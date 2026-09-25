# GitHub Sync Development

This guide covers deployment setup for GitHub secret and user synchronization. For sync behavior, prerequisites, enabling sync, and monitoring, see [GitHub Sync](/operations_github_sync.md).

## GitHub App setup

NR Broker requires a GitHub App with credentials configured in the deployment:

- `GITHUB_SYNC_CLIENT_ID`
- `GITHUB_SYNC_PRIVATE_KEY`
- `GITHUB_MANAGED_URL_REGEX` (optional; defaults to `https://github.com/<owner>/<repository>`)

See [Backend Environment Variables](/dev_env_vars.md).

Install the [GitHub App](https://docs.github.com/en/apps/using-github-apps/installing-your-own-github-app) in the organization and repositories associated with the services being synchronized. Grant the app permission to manage repository Actions secrets for secret sync and collaborators for user sync.

The Broker Token must be allowed to read the tools secret path for each service:

```hcl
path "apps/data/tools/+/+" {
  capabilities = ["read"]
}
```

Do not grant the Broker Token access to other service environments unless the deployment requires it.

## Configure user sync roles

User sync uses the `edgeToRoles` array on the user collection configuration to map graph edges to GitHub collaborator roles. Configure this when user sync is enabled:

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
  },
)
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `edge` | string[] | Yes | Graph edge names that map to this role |
| `role` | string | Yes | GitHub collaborator role (`admin`, `maintain`, `write`, `read`, `triage`) |
| `label` | string | Yes | Display name for the role |
| `description` | string | Yes | Description shown in the UI |
| `url` | string | Yes | URL associated with the role |
