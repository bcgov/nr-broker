#!/usr/bin/env bash

# ./role-finder.sh prod fluent fluent-bit
#  $1: vault environment
#  $2: project name
#  $3: service name

if [ -z "$1" ]
  then
    echo "No environment supplied"
fi

if [ -n "$1" ]
then
  VAULT_ADDR="https://vault-iit-$1.apps.silver.devops.gov.bc.ca"
  if [ "prod" = $1 ]
  then
    VAULT_ADDR="https://vault-iit.apps.silver.devops.gov.bc.ca"
  fi
  VAULT_TOKEN=$(VAULT_ADDR=$VAULT_ADDR vault login -method=oidc -format json -no-store | jq -r '.auth.client_token')
  DEV_ROLE_ID=$(VAULT_ADDR=$VAULT_ADDR VAULT_TOKEN=$VAULT_TOKEN vault read -format json auth/vs_apps_approle/role/$2_$3_dev/role-id 2> /dev/null | jq -r '.data.role_id')
  TEST_ROLE_ID=$(VAULT_ADDR=$VAULT_ADDR VAULT_TOKEN=$VAULT_TOKEN vault read -format json auth/vs_apps_approle/role/$2_$3_test/role-id 2> /dev/null | jq -r '.data.role_id')
  PROD_ROLE_ID=$(VAULT_ADDR=$VAULT_ADDR VAULT_TOKEN=$VAULT_TOKEN vault read -format json auth/vs_apps_approle/role/$2_$3_prod/role-id 2> /dev/null | jq -r '.data.role_id')

  if [ "prod" != $1 ]
  then
    VAULT_ADDR="https://vault-iit.apps.silver.devops.gov.bc.ca"
    VAULT_TOKEN=$(VAULT_ADDR=$VAULT_ADDR vault login -method=oidc -format json -no-store | jq -r '.auth.client_token')
  fi

  echo "$2 : $3 - Role Id"
  echo "dev: $DEV_ROLE_ID"
  echo "test: $TEST_ROLE_ID"
  echo "prod: $PROD_ROLE_ID"
  echo "Wrapped token:"
  VAULT_WRAP_JSON=$(echo "{\"service\": \"$2 : $3\", \"dev\": \"$DEV_ROLE_ID\", \"test\": \"$TEST_ROLE_ID\", \"prod\": \"$PROD_ROLE_ID\", \"vault_env\": \"$1\"}" | \
    VAULT_ADDR=$VAULT_ADDR VAULT_TOKEN=$VAULT_TOKEN vault write -format json /sys/wrapping/wrap - | jq '.wrap_info.token')
  echo $VAULT_WRAP_JSON | jq '.'
fi