#!/usr/bin/env bash

cd "${0%/*}"

TOKEN=$(curl -s -X POST $BROKER_URL/intention -H 'Content-Type: application/json' -u "$BASIC_HTTP_USER:$BASIC_HTTP_PASSWORD" -d @provision-fluent-bit.json | jq -r '.token')
echo "INTENTION: $TOKEN"

SECRET_ID=$(curl -s -X POST $BROKER_URL/provision/approle/secret-id -H 'X-Broker-Token: '"$TOKEN"'' -H 'X-Vault-Role-Id: '"$PROVISION_ROLE_ID"'' -u "$BASIC_HTTP_USER:$BASIC_HTTP_PASSWORD" -d @provision-fluent-bit.json)
echo "SECRET_ID: $SECRET_ID"

# Finalize intention
curl -s -X POST $BROKER_URL/intention/finalize -H 'X-Broker-Token: '"$TOKEN"'' -u "$BASIC_HTTP_USER:$BASIC_HTTP_PASSWORD"
