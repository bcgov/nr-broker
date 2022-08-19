#!/usr/bin/env bash

cd "${0%/*}"

curl -s -X POST $BROKER_URL/provision/secret-id -H 'Content-Type: application/json' -H 'X-Vault-Role-Id: '"$PROVISION_ROLE_ID"'' -u "$BASIC_HTTP_USER:$BASIC_HTTP_PASSWORD" -d @provision-fluent-bit.json
