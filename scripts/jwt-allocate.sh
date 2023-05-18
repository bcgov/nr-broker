#!/usr/bin/env bash

[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

# ./jwt-allocate.sh prod NRIDS.OneTeam@gov.bc.ca client_id
#  $1: environment
#  $2: team email (subject)
#  $3: client_id (optional)

source ./setenv-common.sh $1
if [ $? != 0 ]; then [ $PS1 ] && return || exit; fi

if [ -z "$2" ]
  then
    echo "No subject supplied"
fi

if [ -n "$1" ] && [ -n "$2" ]
  then
  export JWT_SECRET=$(eval $JWT_SECRET_CMD)
  export BROKER_JWT=$(./gen-team-jwt.mjs $2 $3)

  VAULT_ADDR="https://vault-iit.apps.silver.devops.gov.bc.ca"
  VAULT_TOKEN=$(eval $VAULT_TOKEN_CMD)

  echo "Token: $BROKER_JWT"
  echo "Wrapped token:"
  VAULT_WRAP_JSON=$(echo "{\"environment\": \"$1\", \"token\": \"$BROKER_JWT\"}" | \
    VAULT_ADDR=$VAULT_ADDR VAULT_TOKEN=$VAULT_TOKEN vault write -format json /sys/wrapping/wrap - | jq '.wrap_info.token')
  echo $VAULT_WRAP_JSON | jq '.'
fi