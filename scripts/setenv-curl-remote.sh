#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

source ./setenv-common.sh $1
if [ $? != 0 ]; then [ $PS1 ] && return || exit; fi

VAULT_TOKEN=$(eval $VAULT_TOKEN_CMD)
export CONFIG_ROLE_ID=$(vault read -format json auth/$VAULT_APPROLE_PATH/role/jenkins_jenkins-isss_prod/role-id | jq -r '.data.role_id')
export PROVISION_ROLE_ID=$(vault read -format json auth/$VAULT_APPROLE_PATH/role/fluent_fluent-bit_prod/role-id | jq -r '.data.role_id')

export JWT_SECRET=$(eval $JWT_SECRET_CMD)
export BROKER_JWT=$(./gen-team-jwt.mjs)
