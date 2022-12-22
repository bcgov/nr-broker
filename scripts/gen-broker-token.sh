#!/usr/bin/env bash

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
  ROLE_ID=$(VAULT_ADDR=$VAULT_ADDR VAULT_TOKEN=$VAULT_TOKEN vault read -format json auth/vs_apps_approle/role/vault_nr-broker_prod/role-id | jq -r '.data.role_id')
  SECRET_ID=$(VAULT_ADDR=$VAULT_ADDR VAULT_TOKEN=$VAULT_TOKEN vault write -format json -f auth/vs_apps_approle/role/vault_nr-broker_prod/secret-id | jq -r '.data.secret_id')
  BROKER_TOKEN=$(VAULT_ADDR=$VAULT_ADDR VAULT_TOKEN=$VAULT_TOKEN vault write -format json -f auth/vs_apps_approle/login role_id=$ROLE_ID secret_id=$SECRET_ID | jq -r '.auth.client_token')

  echo -n $BROKER_TOKEN
fi