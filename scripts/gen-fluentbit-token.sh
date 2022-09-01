#!/usr/bin/env bash

VAULT_ADDR="https://vault-iit.apps.silver.devops.gov.bc.ca"
VAULT_TOKEN=$(vault login -method=oidc -format json -tls-skip-verify | jq -r '.auth.client_token')
ROLE_ID=$(vault read -format json auth/vs_apps_approle/role/fluent_fluent-bit_prod/role-id | jq -r '.data.role_id')
SECRET_ID=$(vault write -format json -f auth/vs_apps_approle/role/fluent_fluent-bit_prod/secret-id | jq -r '.data.secret_id')
FLUENT_TOKEN=$(vault write -format json -f auth/vs_apps_approle/login role_id=$ROLE_ID secret_id=$SECRET_ID | jq -r '.auth.client_token')

echo $FLUENT_TOKEN
