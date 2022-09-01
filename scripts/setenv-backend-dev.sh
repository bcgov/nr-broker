#!/usr/bin/env bash

# Only prod has "real" secrets
VAULT_ADDR="https://vault-iit.apps.silver.devops.gov.bc.ca"
VAULT_TOKEN=$(vault login -method=oidc -format json -tls-skip-verify | jq -r '.auth.client_token')
FLUENT_ROLE_ID=$(vault read -format json auth/vs_apps_approle/role/fluent_fluent-bit_prod/role-id | jq -r '.data.role_id')
FLUENT_SECRET_ID=$(vault write -format json -f auth/vs_apps_approle/role/fluent_fluent-bit_prod/secret-id | jq -r '.data.secret_id')
FLUENT_VAULT_TOKEN=$(vault write -format json -f auth/vs_apps_approle/login role_id=$FLUENT_ROLE_ID secret_id=$FLUENT_SECRET_ID | jq -r '.auth.client_token')

# Use dev for broker development as we don't want it creating real tokens
export VAULT_ADDR="https://vault-iit-dev.apps.silver.devops.gov.bc.ca"
VAULT_TOKEN=$(vault login -method=oidc -format json -tls-skip-verify | jq -r '.auth.client_token')
BROKER_ROLE_ID=$(vault read -format json auth/vs_apps_approle/role/vault_nr-broker_prod/role-id | jq -r '.data.role_id')
BROKER_SECRET_ID=$(vault write -format json -f auth/vs_apps_approle/role/vault_nr-broker_prod/secret-id | jq -r '.data.secret_id')
export BROKER_TOKEN=$(vault write -format json -f auth/vs_apps_approle/login role_id=$BROKER_ROLE_ID secret_id=$BROKER_SECRET_ID | jq -r '.auth.client_token')
export VAULT_TOKEN=$FLUENT_VAULT_TOKEN

export HTTP_BASIC_USER=myusername
export HTTP_BASIC_PASS=password123
