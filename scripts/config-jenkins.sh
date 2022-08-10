#!/bin/bash

cd "${0%/*}"

curl -X POST http://localhost:3000/provision/token -H 'Content-Type: application/json' -H "X-Vault-Role-Id: $SAMPLE_ROLE_ID" -u "myusername:password123" -d @config-jenkins.json
