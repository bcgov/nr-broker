#!/usr/bin/env bash

if [ -z "$1" ]
  then
    echo "No environment supplied"
fi

if [ -n "$1" ]
  then
  export VAULT_ADDR="https://vault-iit-$1.apps.silver.devops.gov.bc.ca"
  if [ "prod" = $1 ]
  then
    export VAULT_ADDR="https://vault-iit.apps.silver.devops.gov.bc.ca"
  fi
  VAULT_TOKEN=$(vault login -method=oidc -format json -tls-skip-verify | jq -r '.auth.client_token')
  ROLE_ID=$(vault read -format json auth/vs_apps_approle/role/vault_nr-broker_prod/role-id | jq -r '.data.role_id')
  SECRET_ID=$(vault write -format json -f auth/vs_apps_approle/role/vault_nr-broker_prod/secret-id | jq -r '.data.secret_id')
  export BROKER_TOKEN=$(vault write -format json -f auth/vs_apps_approle/login role_id=$ROLE_ID secret_id=$SECRET_ID | jq -r '.auth.client_token')

  echo $BROKER_TOKEN
fi