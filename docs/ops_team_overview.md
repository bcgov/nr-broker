# Team Owner Quick Start

This page is for people who own or manage a team in NR Broker. It explains what a team owner does, how teams work, and where to go next.

## Who is a team owner?

A team owner is responsible for managing access to the projects and services your team delivers. You control who is on the team, what roles they have, and which Broker accounts your applications use.

You might be a team owner if you:
- Lead a group that builds or maintains software
- Are responsible for ensuring your team can deploy and access secrets
- Need to manage who has access to your team's resources

If you're not yet a team owner but need one, contact your current team owner or your organization's Broker administrator.

## What does a team owner do?

### Manage team membership

You add people to your team and assign them roles. Roles determine what each person can do — for example, a "lead-developer" can generate tokens, while other roles may have more limited access.

See: [Manage My Team](/ops_manage_team.md)

### Set up Broker accounts

Your applications need Broker accounts to access secrets and perform automated tasks. As a team owner, you ensure the right accounts exist and are connected to your projects and services.

See: [Broker Accounts](/ops_broker_account.md)

### Keep tokens current

Broker account tokens expire and need to be rotated. Make sure at least one team member with "lead-developer" permissions can generate and renew tokens, so your services don't lose access.

See: [Broker Account Tokens](/dev_account_token.md)

## How teams connect to resources

A team in Broker is linked to the things your group works with:

- **Projects** — High-level groupings of related work (for example, "Customer Portal" or "Data Platform")
- **Services** — Individual applications or components your team maintains
- **Repositories** — Source code repositories your team manages
- **Clouds** — Cloud resources used to deploy your services
- **Broker Accounts** — Service identities your applications use to access secrets

When someone joins your team, Broker knows which of these resources they can work with based on their role. You don't need to grant individual permissions for each project or service.

## Working across teams

Teams often depend on each other. One team might provide a service that another team uses, or share infrastructure. These connections show up in Broker's graph view, making it easy to understand how different parts of your system work together.

The browse and graph sections let you filter the view based on what you're connected to through your teams, so you can focus on the resources relevant to your work.

## Centralized user authorization

Broker acts as a single source of truth for who has access to what. Instead of managing permissions separately in GitHub, Kubernetes, Vault, or other systems, you manage them once in Broker — and sync distributes those permissions downstream.

### How it works

When you add someone to your team with a specific role, Broker records that connection in its graph. Sync jobs then read the graph and update external systems to match:

- **GitHub user sync** — Keeps repository collaborator roles aligned with team membership. If someone is a "developer" on your team in Broker, GitHub sync ensures they have write access to your repositories.
- **Secret access** — Broker controls who can open intentions for which services, so only authorized team members can trigger deployments or access secrets.

This means when someone leaves the team or changes roles, you update it once in Broker, and sync propagates the change.

## Centralized secret management

Broker centralizes secret lifecycle management through a few key mechanisms:

### Secrets are stored in Vault

All service secrets (database passwords, API keys, certificates, etc.) are stored in HashiCorp Vault. Broker never stores the actual secret values — it acts as a gatekeeper that validates requests and delegates access to Vault.

### Tokens are generated through Broker

When you generate a Broker account token, it is automatically saved to Vault's tools path for all associated services. If your deployment has sync enabled, those tokens are then distributed to GitHub repository secrets or Kubernetes namespaces — so developers don't need to manually copy tokens into CI/CD pipelines.

### Secrets are audited

Every time a secret is accessed through Broker — whether by a human opening an intention or an automated pipeline — the activity is recorded in the audit log. This gives you visibility into who accessed what, when, and from where.

## What secrets should be managed centrally?

As a general rule, any secret used by your team's services that isn't internal to the service should be managed through Broker and Vault:

| Secret type | Example | Why manage centrally |
|-------------|---------|----------------------|
| Database credentials | Passwords for PostgreSQL, MongoDB | Rotated without code changes, audited access |
| API keys | Third-party service tokens | Revoked if compromised, scoped to environments |
| TLS certificates | Private keys for HTTPS | Centralized renewal, consistent across deployments |
| Broker account tokens | JWTs used by CI/CD pipelines | Auto-distributed via sync, rotated on expiry |

Secrets that are personal to an individual (for example, a developer's personal API key for an external tool), or used by the team (for example, an admin account) do not need to be managed through Broker. Those secrets are not used by the service itself so are outside of Broker's scope. Your Vault may provide locations to store these types of secrets.

If the service uses an internal secrets that is already rotated and audited, then managing it through Broker and Vault may provide little benefit.

## How sync supports your team

Sync jobs run automatically in the background and keep external systems aligned with what you configure in Broker:

- **GitHub secret sync** — Copies tokens from Vault to GitHub repository secrets, so your GitHub Actions workflows have access without manual setup. See: [GitHub Sync](/operations_github_sync.md)
- **GitHub user sync** — Updates repository collaborator roles based on team membership and roles in Broker
- **Kubernetes secret sync** — Pushes secrets to Kubernetes namespaces for services deployed there. See: [Kubernetes / OpenShift Secret Sync](/operations_kubernetes_sync.md)

As a team owner, you don't need to configure sync yourself — it is set up by your Broker administrator. You do need to make sure repository records have secret sync and user sync enabled, so the automation works for your team's resources.
