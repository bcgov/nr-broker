#!/bin/bash

cd "${0%/*}"

curl -X POST http://localhost:3000/provision -H 'Content-Type: application/json' -H "X-Vault-Role-Id: $SAMPLE_ROLE_ID" -u "myusername:password123" -d @sample.json
