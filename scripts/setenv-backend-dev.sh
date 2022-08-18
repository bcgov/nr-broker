#!/bin/bash

export VAULT_ADDR="https://vault-iit-dev.apps.silver.devops.gov.bc.ca"
VAULT_TOKEN=$(vault login -method=oidc -format json -tls-skip-verify | jq -r '.auth.client_token')
ROLE_ID=$(vault read -format json auth/vs_apps_approle/role/vault_nr-broker_prod/role-id | jq -r '.data.role_id')
SECRET_ID=$(vault write -format json -f auth/vs_apps_approle/role/vault_nr-broker_prod/secret-id | jq -r '.data.secret_id')
export VAULT_TOKEN=$(vault write -format json -f auth/vs_apps_approle/login role_id=$ROLE_ID secret_id=$SECRET_ID | jq -r '.auth.client_token')
export HTTP_BASIC_USER=myusername
export HTTP_BASIC_PASS=password123
