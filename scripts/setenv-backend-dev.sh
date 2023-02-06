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

export VAULT_TOKEN=$(eval $VAULT_TOKEN_CMD)
BROKER_ROLE_ID=$(vault read -format json auth/$VAULT_APPROLE_PATH/role/$VAULT_BROKER_ROLE/role-id | jq -r '.data.role_id')
BROKER_SECRET_ID=$(vault write -format json -f auth/$VAULT_APPROLE_PATH/role/$VAULT_BROKER_ROLE/secret-id | jq -r '.data.secret_id')
export BROKER_TOKEN=$(vault write -format json -f auth/$VAULT_APPROLE_PATH/login role_id=$BROKER_ROLE_ID secret_id=$BROKER_SECRET_ID | jq -r '.auth.client_token')
export VAULT_TOKEN=""
if [ -n "$1" ] && [ "kinesis" = "$1" ]; then
  export VAULT_TOKEN=$AUDIT_VAULT_TOKEN
  export APP_ENVIRONMENT=development
else
  unset APP_ENVIRONMENT
fi

export JWT_SECRET=secret
export JWT_VALIDATION_SUB=$JWT_DEFAULT_SUB
export JWT_VALIDATION_JTI_DENY=

export USER_ADMIN=mbystedt@idir
export USER_DBA=dba@idir
export USER_DEVELOPER=dev1@idir,dev2@idir

export HOSTNAME=nr-broker-app-0
