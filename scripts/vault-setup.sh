#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

source ./setenv-common.sh local
if [ $? != 0 ]; then [ $PS1 ] && return || exit; fi

export VAULT_TOKEN=$(eval $VAULT_TOKEN_CMD)

EXISITING_AUTH=$(vault auth list -format=json | jq -r ".[\"$VAULT_APPROLE_PATH/\"]")

if [[ "null" != "$EXISITING_AUTH" ]]
then
  echo "Already setup! Exiting..."
  exit
fi

echo "Setting up: $VAULT_ADDR"

# Setup kv mounts
vault secrets enable -path=apps -version=2 kv
vault secrets enable -path=groups -version=2 kv
# Setup auth mounts
vault auth enable oidc
vault auth enable -path $VAULT_APPROLE_PATH approle

echo "path \"*\" { capabilities = [\"create\", \"read\", \"update\", \"delete\", \"list\", \"sudo\"] }" | vault policy write broker-policy -
vault write auth/$VAULT_APPROLE_PATH/role/$VAULT_BROKER_ROLE policies=broker-policy
vault write -force auth/$VAULT_APPROLE_PATH/role/$VAULT_AUDIT_ROLE

mongosh -u mongoadmin -p secret --authenticationDatabase admin brokerDB db/mongo-reset-admin-pass.js
MONGODB_ADDR=$(podman inspect -f "{{.NetworkSettings.IPAddress}}" broker-mongo)
vault secrets enable database
vault write database/config/my-mongodb-database \
    plugin_name=mongodb-database-plugin \
    allowed_roles="broker-role" \
    connection_url="mongodb://{{username}}:{{password}}@$MONGODB_ADDR:27017/admin" \
    username="admin_db_engine" \
    password="admin_secret"
vault write database/roles/broker-role \
    db_name=my-mongodb-database \
    creation_statements='{ "db": "admin", "roles": [{ "role": "readWrite", "db": "brokerDB" }] }' \
    default_ttl="168h" \
    max_ttl="168h"

vault audit enable file file_path=/tmp/vault-audit.txt

# Sample approles for demo
vault write -force auth/$VAULT_APPROLE_PATH/role/superapp_superapp-db-sync_prod policies=default
vault write -force auth/$VAULT_APPROLE_PATH/role/superapp_superapp-backend_prod policies=default

vault kv put apps/prod/vault/vsync test=test
