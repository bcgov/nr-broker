#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

# ./role-finder.sh prod project service
#  $1: vault environment
#  $2: project name
#  $3: service name

# Caution: The environment in the command is the broker environment and NOT the service's environment.
#          If you intent to use the JWT to access real secrets then this will be 'prod'.

source ./setenv-common.sh $1
if [ $? != 0 ]; then [ $PS1 ] && return || exit; fi

VAULT_TOKEN=$(VAULT_ADDR=$VAULT_ADDR vault login -method=oidc -format json -no-store | jq -r '.auth.client_token')
DEV_ROLE_ID=$(VAULT_ADDR=$VAULT_ADDR VAULT_TOKEN=$VAULT_TOKEN vault read -format json auth/$VAULT_APPROLE_PATH/role/$2_$3_dev/role-id 2> /dev/null | jq -r '.data.role_id')
TEST_ROLE_ID=$(VAULT_ADDR=$VAULT_ADDR VAULT_TOKEN=$VAULT_TOKEN vault read -format json auth/$VAULT_APPROLE_PATH/role/$2_$3_test/role-id 2> /dev/null | jq -r '.data.role_id')
PROD_ROLE_ID=$(VAULT_ADDR=$VAULT_ADDR VAULT_TOKEN=$VAULT_TOKEN vault read -format json auth/$VAULT_APPROLE_PATH/role/$2_$3_prod/role-id 2> /dev/null | jq -r '.data.role_id')

if [ "prod" != $1 ]
then
  source ./setenv-common.sh prod
  VAULT_TOKEN=$(eval $VAULT_TOKEN_CMD)
fi

echo "$2 : $3 - Role Id"
echo "dev: $DEV_ROLE_ID"
echo "test: $TEST_ROLE_ID"
echo "prod: $PROD_ROLE_ID"
echo "Wrapped token:"
VAULT_WRAP_JSON=$(echo "{\"info\":{\"project\": \"$2\", \"service\": \"$3\", \"vault_env\": \"$1\"}, \
  \"auth/$VAULT_APPROLE_PATH/role/$2_$3_dev/role-id\": \"$DEV_ROLE_ID\", \
  \"auth/$VAULT_APPROLE_PATH/role/$2_$3_test/role-id\": \"$TEST_ROLE_ID\", \
  \"auth/$VAULT_APPROLE_PATH/role/$2_$3_prod/role-id\": \"$PROD_ROLE_ID\"}" | \
  VAULT_ADDR=$VAULT_ADDR VAULT_TOKEN=$VAULT_TOKEN vault write -format json /sys/wrapping/wrap - | jq '.wrap_info.token')
echo $VAULT_WRAP_JSON | jq '.'