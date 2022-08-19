#!/usr/bin/env bash

cd "${0%/*}"

curl -s -X POST $BROKER_URL/provision/token -H 'Content-Type: application/json' -H 'X-Vault-Role-Id: '"$CONFIG_ROLE_ID"'' -u "$BASIC_HTTP_USER:$BASIC_HTTP_PASSWORD" -d @config-jenkins.json
