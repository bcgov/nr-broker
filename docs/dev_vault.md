# Hashicorp Vault

## Local Development

### Connecting to the local

Link: http://localhost:8200/ui/vault/auth?with=token

### Configure local Vault

```bash
# Configure the local Vault with basic setup
$ ./scripts/vault-setup.sh
```

The setup script can be rerun to reset the local database. You may need to reindex the redis cache by calling the api `/v1/graph/reindex-cache`.

## Vault Policies

The local setup script inputs some basic policy configuration. These policies should not be used in production. It is suggested that a separate tool be used to keep your policies up-to-date.

See: [Vault Sync Tool](https://github.com/bcgov-nr/vault-sync-app)

### Vault Sync Tool

The [Vault Sync Tool](https://github.com/bcgov-nr/vault-sync-app) configures HashiCorp Vault using NR Broker as a data source for applications and groups. NR Broker does not require the Vault Sync Tool to run for any of its own operations.

#### Running

The following will start the tool in monitoring mode to update the local Vault.

```
source ./scripts/setenv-curl-local.sh
podman run --rm -e=VAULT_ADDR=http://$(podman inspect -f "{{.NetworkSettings.IPAddress}}" broker-vault):8200 -e=VAULT_TOKEN=$VAULT_TOKEN -e=BROKER_API_URL=http://host.containers.internal:3000/ -e=BROKER_TOKEN=$BROKER_JWT ghcr.io/bcgov-nr/vault-sync-app:v2.1.0
```
