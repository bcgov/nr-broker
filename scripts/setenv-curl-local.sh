#!/bin/bash

export VAULT_ADDR="https://vault-iit-dev.apps.silver.devops.gov.bc.ca"
VAULT_TOKEN=$(vault login -method=oidc -format json -tls-skip-verify | jq -r '.auth.client_token')
export CONFIG_ROLE_ID=$(vault read -format json auth/vs_apps_approle/role/jenkins_jenkins-isss_prod/role-id | jq -r '.data.role_id')
export PROVISION_ROLE_ID=$(vault read -format json auth/vs_apps_approle/role/fluent_fluent-bit_prod/role-id | jq -r '.data.role_id')

export BASIC_HTTP_USER=myusername
export BASIC_HTTP_PASSWORD=password123
export BROKER_URL=http://localhost:3000