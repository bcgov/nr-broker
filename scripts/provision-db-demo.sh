#!/usr/bin/env bash

cd "${0%/*}"

INSTALL_VERSION="12.0.3"

echo "===> Intention open"
# Open intention
RESPONSE=$(curl -s -X POST $BROKER_URL/v1/intention/open \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2NzA1NDU4Nzg2MzIsImlhdCI6MTY3MDU0NTM3ODYzMiwibmFtZSI6ImVuY29yYSIsInN1YiI6IjEyMzQ1Njc4OTAiLCJyb2xlcyI6WyJkZXZlbG9wZXJfc3BhciJdfQ.ImUFoOlTaoxeilOnSck8og6QLeiho8aKre7AdOjm6_s" \
    -d @<(cat provision-db-intention.json | \
        jq ".event.url=\"http://sample.com/job\" \
        " \
    ))
echo "$BROKER_URL/v1/intention/open:"
echo $RESPONSE | jq '.'
if [ "$(echo $RESPONSE | jq '.error')" != "null" ]; then
    echo "Exit: Error detected"
    exit 0
fi

# Save intention token for later
INTENTION_TOKEN=$(echo $RESPONSE | jq -r '.token')
# echo "Hashed transaction.id: $(echo -n $INTENTION_TOKEN | shasum -a 256)"

echo "===> DB provision"

# Get token for provisioning a db access
DB_INTENTION_TOKEN=$(echo $RESPONSE | jq -r '.actions.database.token')
echo "DB_INTENTION_TOKEN: $DB_INTENTION_TOKEN"

# Get secret id for db access
JENKINS_VAULT_TOKEN=$(curl -s -X POST $BROKER_URL/v1/provision/token/self -H 'X-Broker-Token: '"$DB_INTENTION_TOKEN"'' -H 'X-Vault-Role-Id: '"$PROVISION_ROLE_ID"'')
echo "$BROKER_URL/v1/provision/token/self:"
echo $JENKINS_VAULT_TOKEN | jq '.'

# Not shown: Use Vault Token to access database

echo "===> Intention close"

# Use saved intention token to close intention
curl -s -X POST $BROKER_URL/v1/intention/close -H 'X-Broker-Token: '"$INTENTION_TOKEN"''
