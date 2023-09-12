#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")

# Only a production vault instance should have real secrets
if [ -n "$1" ] && [ "kinesis" = "$1" ]; then
  source $this_dir/setenv-common.sh prod
  if [ $? != 0 ]; then [ $PS1 ] && return || exit; fi
  export VAULT_TOKEN=$(eval $VAULT_TOKEN_CMD)
  AUDIT_ROLE_ID=$(vault read -format json auth/$VAULT_APPROLE_PATH/role/$VAULT_AUDIT_ROLE/role-id | jq -r '.data.role_id')
  AUDIT_SECRET_ID=$(vault write -format json -f auth/$VAULT_APPROLE_PATH/role/$VAULT_AUDIT_ROLE/secret-id | jq -r '.data.secret_id')
  AUDIT_VAULT_TOKEN=$(vault write -format json -f auth/$VAULT_APPROLE_PATH/login role_id=$AUDIT_ROLE_ID secret_id=$AUDIT_SECRET_ID | jq -r '.auth.client_token')
fi

# Use local for broker development
source $this_dir/setenv-common.sh local
if [ $? != 0 ]; then [ $PS1 ] && return || exit; fi

export AUDIT_URL_TEMPLATE="https://audit.example/dashboard?from=<%= intention.transaction.start %>&to=<%= intention.transaction.end %>&hash=<%= intention.transaction.hash %>"
export VAULT_TOKEN=$(eval $VAULT_TOKEN_CMD)
BROKER_ROLE_ID=$(vault read -format json auth/$VAULT_APPROLE_PATH/role/$VAULT_BROKER_ROLE/role-id | jq -r '.data.role_id')
BROKER_SECRET_ID=$(vault write -format json -f auth/$VAULT_APPROLE_PATH/role/$VAULT_BROKER_ROLE/secret-id | jq -r '.data.secret_id')
export BROKER_TOKEN=$(vault write -format json -f auth/$VAULT_APPROLE_PATH/login role_id=$BROKER_ROLE_ID secret_id=$BROKER_SECRET_ID | jq -r '.auth.client_token')
MONGODB_AUTH=$(vault read -format json database/creds/broker-role)
export VAULT_TOKEN=""
if [ -n "$1" ] && [ "kinesis" = "$1" ]; then
  export VAULT_TOKEN=$AUDIT_VAULT_TOKEN
  export APP_ENVIRONMENT=development
else
  unset APP_ENVIRONMENT
fi
# Warning: This should not to be enabled in production
export TOKEN_SERVICE_ALLOW_ORPHAN="true"

export JWT_SECRET=secret

export ACTION_VALIDATE_TEAM_ADMIN=64ecc18acf9ec5f71c640e4a
export ACTION_VALIDATE_TEAM_DBA=64fa194693b3afd6ee63aa99

export HOSTNAME=nr-broker-app-0

export NESTJS_UI_ROOT_PATH=ui/dist/ui
export NESTJS_HELMET_HSTS=off

export OAUTH2_CLIENT_REGISTRATION_LOGIN_REDIRECT_URI=http://localhost:3000/auth/callback
export OAUTH2_CLIENT_REGISTRATION_LOGIN_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
export OAUTH2_CLIENT_SESSION_SECRET=super+secret+session+key

export MONGODB_URL="mongodb://{{username}}:{{password}}@localhost:27017/brokerDB?authSource=admin"
export MONGODB_USERNAME=$(echo $MONGODB_AUTH | jq -r '.data.username')
export MONGODB_PASSWORD=$(echo $MONGODB_AUTH | jq -r '.data.password')
