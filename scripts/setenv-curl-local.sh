#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

source ./setenv-common.sh local
if [ $? != 0 ]; then [ $PS1 ] && return || exit; fi

export VAULT_TOKEN=$(eval $VAULT_TOKEN_CMD)
export SUPERAPP_DB_SYNC_ROLE_ID=$(vault read -format json auth/$VAULT_APPROLE_PATH/role/superapp_superapp-db-sync_prod/role-id | jq -r '.data.role_id')
export SUPERAPP_BACKEND_ROLE_ID=$(vault read -format json auth/$VAULT_APPROLE_PATH/role/superapp_superapp-backend_prod/role-id | jq -r '.data.role_id')

export JWT_SECRET=secret
export BROKER_JWT=$(./gen-team-jwt.mjs localhost@example.com 33098695-4a5a-497c-a36a-61691785845c)