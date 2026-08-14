# Developer Quick Start

This page is for developers who want to use NR Broker to deploy software, access secrets, or automate tasks. It explains how to get started, what you'll interact with, and where to find working examples.

## Getting on a team

Before you can use Broker, you need to be a member of a team:

1. **Log in to NR Broker** — Open your organization's Broker URL and sign in
2. **Find your team** — Go to the browse section, select "Team" from the dropdown, and look for your team. Use the "connected" filter to see only teams you're a member of
3. **Request access if needed** — If you don't see your team, reach out to a team owner or use the team's contact details to request membership

Once you're on a team, Broker knows which projects, services, and secrets you can work with based on your role.

## What you'll interact with

As a developer, you'll primarily work with these concepts:

### Broker Accounts

Your applications use Broker accounts (not your personal login) to access secrets and perform automated tasks. Think of a Broker account like a service identity for your team's projects. Your team owner sets these up.

See: [Broker Accounts](/ops_broker_account.md)

### Account Tokens

To authenticate with Broker's API, your applications need an account token. Team members with "lead-developer" permissions can generate and renew these tokens through the Broker UI.

See: [Broker Account Tokens](/dev_account_token.md)

### Intentions

An intention is a validated request that describes what you want to do — deploy software, access secrets, record a build, and so on. You send an intention to Broker, it checks business rules, and if everything passes, you get tokens to proceed.

The basic flow is:
1. Open an intention with your account token
2. Broker validates against business rules
3. If valid, Broker returns action tokens
4. Use those tokens to access secrets or perform work
5. Close the intention when done

See: [Integrating Overview](/dev_integrate_overview.md) and [Intention Lifecycle](/dev_intention_lifecycle.md)

### The Graph View

Broker's graph view shows how teams, projects, services, environments, and other resources are connected. Use it to understand the structure of your deployment and find the right service or environment for your work.

## How Broker grants you access

When your team owner adds you to a team with a specific role, Broker records that connection. From there, Broker controls your access to development tools in two ways:

### Authorization through intentions

Every time you (or an automated process) want to deploy software or access secrets, you open an intention. Broker checks:

- Are you on a team connected to the service?
- Does your role allow this action?
- Do business rules pass (for example, was a build deployed to test first)?

If everything checks out, Broker gives you tokens to proceed. If not, you get a clear message about what failed and how to fix it.

### Repository access through user sync

If your deployment has GitHub sync enabled, Broker keeps your repository access in sync with your team role. When you're added as a "developer" on a team, GitHub sync ensures you have write access to that team's repositories — no manual permission requests needed.

## Linking your GitHub account

If your deployment uses GitHub, you should link your Broker account to your GitHub account. This is important for two reasons:

### Why link?

- **User sync needs it** — Broker uses your linked GitHub identity to match you with repository collaborators. Without it, user sync can't keep your repository access aligned with your team role
- **Intentions accept your GitHub username** — Once linked, you can reference `yourname@github` in intention user fields instead of your internal directory ID, which is useful for automated pipelines

### How to link

The process depends on your deployment, but typically:

1. Log in to NR Broker
2. Navigate to your profile or preferences section
3. Click the option to link your GitHub account
4. Authorize Broker to access your GitHub identity
5. Your GitHub username is now stored as an alias linked to your Broker account

If you don't see a linking option, your deployment may not have this feature enabled — ask your team owner or Broker administrator.

### Checking your link status

You can verify whether your GitHub account is linked:

1. Go to the browse section in NR Broker
2. Select "User" from the collection dropdown
3. Search for yourself by name
4. Check if a GitHub alias appears on your user record

If it's not there, complete the linking steps above.

## How secret management works for deployments

When you deploy software, your application needs secrets — database passwords, API keys, certificates, and so on. Broker helps manage these through a few key mechanisms:

### Secrets live in Vault

All service secrets are stored in HashiCorp Vault. Your applications don't read secrets directly from Vault — they go through Broker, which validates that you're authorized to access them.

### Tokens get distributed automatically

When your team generates a Broker account token, it is saved to Vault for all associated services. If your deployment has sync enabled, those tokens are automatically copied to GitHub repository secrets or Kubernetes namespaces. This means:

- You don't manually copy tokens into CI/CD pipelines
- Token rotation happens in one place (Broker), and sync propagates the change
- If a token is compromised, revoking it in Broker cuts access everywhere

### Every access is audited

When you open an intention to access secrets, Broker records the activity — who did it, which service, when, and from where. This audit trail helps with troubleshooting and compliance reviews.

See: [Using Intentions to Access Vault](/dev_intention_usage.md) for a complete walkthrough.

## Working examples

The NR Broker repository includes sample scripts and intention files in the [`samples/`](https://github.com/bcgov-nr/nr-broker/tree/main/samples) directory. These demonstrate common workflows:

| Sample | Description |
|--------|-------------|
| `provision-app-quick-build.*` | Record a package build |
| `provision-app-quick-install.*` | Deploy a package to an environment |
| `provision-app-quick-dc.*` | Deploy with database configuration |
| `provision-app-backend-demo.*` | Full backend provisioning workflow |
| `provision-app-db-sync-demo.*` | Database synchronization workflow |
| `provision-app-jwt.*` | JWT-based provisioning |

Each sample typically includes:
- A `.json` file with the intention payload
- A `.sh` script showing the full API call sequence

You can adapt these for your own workflows. The intention JSON files are a good starting point — modify the service name, project, environment, and user fields to match your setup.

## Next steps

Once you're on a team and have a token, explore:

- [Integrating Overview](/dev_integrate_overview.md) — How Broker accounts, teams, and intentions work together
- [Intention Lifecycle](/dev_intention_lifecycle.md) — Step-by-step guide to the intention workflow
- [Using Intentions to Access Vault](/dev_intention_usage.md) — Full walkthrough with API examples
- [GitHub Actions](/github_actions.md) — Pre-built actions for CI/CD workflows
- [Intention Action Reference](/dev_intention_actions.md) — All available action types
