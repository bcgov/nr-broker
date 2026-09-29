# Onboarding an Application

The onboarding API creates everything a new application needs in Broker in one call: the project, the service with its environment instances and Vault configuration, the source repository, and the connections between them. It replaces the manual steps in "Set up NR Broker for a new application".

## Who can use it

- **A team's broker account token**, if an admin has switched on **Enable onboarding** for that account. The new project is authorized for that account, so the team that owns the account owns the application.
- **An admin session** in the Broker UI or API. Admins must name the broker account to authorize.

Everything else — creating broker accounts, generating tokens, editing or deleting objects — is unchanged and stays with team owners and admins.

## How it works

`POST /v1/onboarding` takes a manifest describing the application. By default it is a **dry run**: it checks everything and returns the plan without changing anything. Add `?apply=true` to create what the plan lists.

```bash
curl -s -X POST "https://broker.io.nrs.gov.bc.ca/v1/onboarding" \
  -H "Authorization: Bearer $BROKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d @onboarding.json
```

```json
{
  "project": { "name": "ata", "title": "ATA" },
  "service": { "name": "ata-war", "title": "ATA" },
  "environments": ["development", "test", "production"],
  "repository": { "name": "nr-ata", "scmUrl": "https://github.com/bcgov-c/nr-ata" }
}
```

| Field | Required | Notes |
|---|---|---|
| `project.name` | yes | Lower case letters, digits and hyphens, starting with a letter |
| `service.name` | yes | Must start with the project name and a hyphen, e.g. `ata-war` |
| `environments` | yes | Existing environments; one service instance is created per environment |
| `repository` | no | `scmUrl` must be `https://github.com/<allowed owner>/<repo>` and its repo must match `name`. Secret sync and user sync default to on |
| `provisionTokens` | no | Provision-token services to connect. Defaults to the first allowlisted one (`jenkins-apps`) |
| `account` | admins only | The broker account to authorize. Token callers cannot name another account |

The service is created with Vault and AppRole enabled, so the Vault sync generates its policies and AppRoles as usual.

## What the plan tells you

Every object and connection gets one action:

| Action | Meaning |
|---|---|
| `create` | Would be created (dry run) |
| `created` | Was created (apply) |
| `reuse` | Already exists and already belongs to this application |
| `conflict` | Exists but belongs to someone else — nothing is applied |
| `invalid` | Fails validation — nothing is applied |

If any step is `conflict` or `invalid`, `ok` is `false` and an apply changes nothing.

## Safety rules

- **Dry run first.** Nothing changes without `?apply=true`.
- **Create-only.** Existing objects are never edited or deleted.
- **No takeovers.** A project is reused only if it is already authorized for the calling account; a service only if it is already a component of that project; a repository only if its URL matches. Anything else is a conflict.
- **Instances are per service.** Instance names like `development` are shared by every application, so they are only ever matched among the service's own instances.
- **Safe to re-run.** A second apply finds everything in place and creates nothing. If an apply fails part-way, re-running it finishes the job.
- **Audited.** Each object and connection is recorded in the audit log like any other graph change.

## Configuration

| Environment variable | Default | Purpose |
|---|---|---|
| `BROKER_ONBOARDING_SCM_OWNERS` | `bcgov,bcgov-c,bcgov-nr` | GitHub owners allowed in `repository.scmUrl` |
| `BROKER_ONBOARDING_PROVISION_TOKENS` | `jenkins-apps` | Provision-token services onboarding may connect; the first is the default |
