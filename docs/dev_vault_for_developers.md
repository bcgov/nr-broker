# Understanding Vault

This page explains what HashiCorp Vault is, how it fits into your development workflow with NR Broker, and what you need to know as a developer.

## What is Vault?

HashiCorp Vault is a secrets management tool. It stores sensitive data — passwords, API keys, certificates, and more — in an encrypted format and controls who can access them.

In the context of NR Broker, Vault is the secure storage backend for all service secrets. Broker never stores secret values itself. Instead, Broker acts as a gatekeeper: it validates your request, checks business rules, and then delegates access to Vault.

## Why does this matter to you?

As a developer, you may interact with Vault directly depending on your team's configuration and the environment. Understanding how Vault fits into the picture helps you:

- Understand why certain workflows exist (for example, provisioning vs. accessing)
- Troubleshoot issues when secrets aren't available
- Know what happens to your secrets after a deployment

## Provisioning vs. accessing

When you need secrets through Broker, there are two patterns:

### Provisioning (long-lived access)

Use this when an application needs continued access to secrets — for example, a server that runs for days or weeks. The application gets a renewable Vault token that it can use to read secrets as needed.

**Typical use cases:**
- Starting a long-running service in Kubernetes or on-premise
- A background worker that needs database credentials

### Accessing (temporary access)

Use this when you need short-lived access — for example, a CI/CD job that runs a database migration and then exits. The application gets a non-renewable Vault token valid only for the duration of the task.

**Typical use cases:**
- Running Liquibase or a similar migration tool
- A one-off script that reads configuration

The key difference is that provisioned tokens can be renewed (so the application doesn't lose access), while accessed tokens expire and cannot be renewed.

## How Broker controls Vault access

Your access to service secrets is determined by two factors: your role in NR Broker and the environment you're working with.

### Role-Based Access

There are two distinct ways actors are granted Vault access:

- **Developers (OIDC)** — When you log in via OIDC, your client role is mapped to internal groups with specific Vault policies. These policies differ per environment — for example, a developer might have `project-kv-read` and `app-db-read` in test, but `project-kv-write` and `app-db-readwrite` in development.
- **Application AppRoles** — Applications authenticate using [AppRole](https://developer.hashicorp.com/vault/docs/auth/approle), a separate Vault auth method (not OIDC). AppRoles get policies scoped to the application's secrets for a specific environment.

The exact policies for both depend on how your application is configured in the Vault Sync Tool.

### Environment Scoping

When you open an intention through Broker, here's what happens behind the scenes:

1. **Broker validates your request** — Checks that your account is connected to the service, that business rules pass, and that you're authorized for the environment
2. **Vault returns a constrained token** — The token is scoped by policies to the specific service and environment in your intention
3. **You use the token** — Your application uses this token to read the secrets it needs

Your Vault token can only access secrets allowed by your policy — if you don't have write access to production KV secrets, your token won't be able to write them, even if Broker validates your intention successfully. Note that some environments may be configured to restrict direct developer access to Vault entirely.

## What happens when secrets change?

Secrets in Vault can be rotated (changed) without affecting running applications. There are several ways to keep your application up to date:

- **Vault Agent process supervisor mode** — Run your application as a child process of Vault Agent, which injects secrets as environment variables via `env_template` blocks and automatically restarts the process when secrets change. See the [Vault Agent process supervisor docs](https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/process-supervisor).
- **Vault Agent file templating** — Use Vault Agent `template` blocks to render secrets into config files, which are re-rendered when values change
- **Vault API libraries** — Integrate directly with the Vault HTTP API using a library for your language (for example, `node-vault`, `hvac` for Python, or the official Go SDK). The application reads secrets at startup or on a schedule and handles rotation itself

As a developer, this means:
- You don't need to restart your application when a password changes
- Secret rotation is transparent to your deployment pipeline
- Your applications always use the current secret values

## Common questions

### Can I see what secrets my service has?

You can browse directly in Vault, subject to your Vault policies. NR Broker provides links to Vault on the service browse page where you can view your secrets directly,

### What if I need a new secret for my service?

You may be able to add the secret yourself. For environments you cannot, contact your Vault administrator. New secrets are added directly in Vault, not through NR Broker.

### Why can't I access secrets directly from Vault in some environments?

Certain environments (typically production) may be configured to restrict direct developer access to Vault. In those cases, access goes through Broker so that every action is recorded, validated against business rules, and scoped to the right service and environment. Development environments are often more permissive.

## Next steps

- [Using Intentions to Access Vault](/dev_intention_usage.md) — Complete walkthrough with API examples
- [Intention Lifecycle](/dev_intention_lifecycle.md) — How intentions work from open to close
