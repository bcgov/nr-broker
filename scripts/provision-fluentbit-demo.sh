#!/usr/bin/env bash

cd "${0%/*}"

# Open intention
RESPONSE=$(curl -s -X POST $BROKER_URL/intention/open -H 'Content-Type: application/json' -u "$BASIC_HTTP_USER:$BASIC_HTTP_PASSWORD" -d @provision-fluentbit-intention.json)
echo "RESPONSE: $RESPONSE"

# Save intention token for later
INTENTION_TOKEN=$(echo $RESPONSE | jq -r '.token')

# Get token for provisioning Jenkins vault token
JENKINS_INTENTION_TOKEN=$(echo $RESPONSE | jq -r '.intention.login.token')
echo "JENKINS_INTENTION_TOKEN: $JENKINS_INTENTION_TOKEN"

# Provision token for application to login as itself to Vault
JENKINS_VAULT_TOKEN=$(curl -s -X POST $BROKER_URL/provision/token/self -H 'X-Broker-Token: '"$JENKINS_INTENTION_TOKEN"'' -H 'X-Vault-Role-Id: '"$CONFIG_ROLE_ID"'')
echo "JENKINS_VAULT_TOKEN: $JENKINS_VAULT_TOKEN"

# Not shown: Use Vault Token to retreive login information for server & install package (No provisioning required)

# Get token for provisioning a Fluentbit deployment
FLUENTBIT_INTENTION_TOKEN=$(echo $RESPONSE | jq -r '.intention.provision.token')
echo "FLUENTBIT_INTENTION_TOKEN: $FLUENTBIT_INTENTION_TOKEN"

# Get secret id for fluentbit provisioning
FLUENTBIT_SECRET_ID=$(curl -s -X POST $BROKER_URL/provision/approle/secret-id -H 'X-Broker-Token: '"$FLUENTBIT_INTENTION_TOKEN"'' -H 'X-Vault-Role-Id: '"$PROVISION_ROLE_ID"'')
echo "FLUENTBIT_SECRET_ID: $FLUENTBIT_SECRET_ID"

# Not shown: Provision fluentbit service with Vault Token

# Use saved intention token to close intention
curl -s -X POST $BROKER_URL/intention/close -H 'X-Broker-Token: '"$INTENTION_TOKEN"''
