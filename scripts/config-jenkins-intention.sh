#!/usr/bin/env bash

cd "${0%/*}"

TOKEN=$(curl -s -X POST $BROKER_URL/intention/open -H 'Content-Type: application/json' -u "$BASIC_HTTP_USER:$BASIC_HTTP_PASSWORD" -d @config-jenkins.json | jq -r '.token')
echo "INTENTION: $TOKEN"

APP_TOKEN=$(curl -s -X POST $BROKER_URL/provision/token/self -H 'X-Broker-Token: '"$TOKEN"'' -H 'X-Vault-Role-Id: '"$CONFIG_ROLE_ID"'')
echo "APP_TOKEN: $APP_TOKEN"

# Close intention
curl -s -X POST $BROKER_URL/intention/close -H 'X-Broker-Token: '"$TOKEN"''
