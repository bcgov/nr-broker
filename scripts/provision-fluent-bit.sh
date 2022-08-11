#!/usr/bin/env bash

cd "${0%/*}"

curl -X POST http://localhost:3000/provision/secret-id -H 'Content-Type: application/json' -H 'X-Vault-Role-Id: '"$PROVISION_ROLE_ID"'' -u "myusername:password123" -d @provision-fluent-bit.json
