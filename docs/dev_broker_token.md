# Broker Token

Each Broker cluster uses a Vault Token called the "Broker Token" to authenticate all Vault API calls. Only intentions that pass validation can make use of the token and only for the service declared in the action.

The primary Broker node (determined by the hostname) will renew this token automatically.

There are three scenarios where you may need to create a NR Broker token:

* Initial start of a NR Broker cluster
* If NR Broker is down for an extended period then the Broker Token will expire
* If you are rotating the token

## Security

The Broker Token should never be exposed outside of the team responsible for running your Broker and Vault instances.

The token should be renewable and have a TTL (time-to-live) high enough to survive reasonable network or infrastructure outages. A suggested TTL is 24 hours.

Only a user with elevated premissions within Vault should be able to create the Broker Token. The token should be rotated periodically.

## Policy

The Broker Token should only have a minimal set of policies attached to it. The following is a sample policy that allows brokering services on the endpoint 'vs_apps_approle'.

```
# Authentication policy for global broker
# Scope: Broker Approle

path "auth/vs_apps_approle/role/+/role-id" {
  capabilities = ["read"]
}

path "auth/vs_apps_approle/role/+/secret-id" {
  capabilities = ["update"]
}

# Deny attempts to generate new Broker tokens
path "auth/vs_apps_approle/role/vault_nr-broker_*" {
  capabilities = ["deny"]
}
```

If you are enabling secret syncronization through NR Broker, the token must be able to read the tools path for services. See: [Tools Secret Syncronization](/operations_secret_sync.md)

See also: [Environment Variables](/dev_env_vars.md)

## How to Generate

Broker Token generation is deployment specific.
