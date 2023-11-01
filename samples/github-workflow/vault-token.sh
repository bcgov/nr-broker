#!/usr/bin/env bash

cd "${0%/*}"

echo "===> Intention open"
echo "$BROKER_ADDR/v1/intention/open:"
# Open intention
TEMP_FILE=$(mktemp)
cat ./intention.json | jq "\
    .event.url=\"$GITHUB_SERVER_URL$GITHUB_EVENT_PATH\" | \
    .user.name=\"mbystedt@azureidir\" | \
    (.actions[] | select(.id == \"access\") .service.environment) |= (\"$GITHUB_ENVIRONMENT\"|ascii_downcase) \
    " > $TEMP_FILE
# cat $TEMP_FILE
RESPONSE=$(curl -s -X POST $BROKER_ADDR/v1/intention/open?quickstart=true \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $BROKER_JWT" \
    -d @$TEMP_FILE \
    )
if [ "$(echo $RESPONSE | jq '.error')" != "null" ]; then
    echo "Exit: Error detected"
    echo $RESPONSE | jq '.'
    exit 1
fi

echo "===> Save intention tokens"
# Save intention token for later
INTENTION_TOKEN=$(echo $RESPONSE | jq -r '.token')
echo "::add-mask::$INTENTION_TOKEN"
echo "INTENTION_TOKEN=$INTENTION_TOKEN" >> $GITHUB_ENV


# Get token for provisioning a db access
ACTION_TOKEN=$(echo $RESPONSE | jq -r '.actions.access.token')
echo "::add-mask::$ACTION_TOKEN"
echo "ACTION_TOKEN=$ACTION_TOKEN" >> $GITHUB_ENV

echo "===> Provision Vault token"

# Get wrapped id for db access
WRAPPED_VAULT_TOKEN_JSON=$(curl -s -X POST $BROKER_ADDR/v1/provision/token/self -H 'X-Broker-Token: '"$ACTION_TOKEN"'' -H 'X-Vault-Role-Id: '"$PROVISION_ROLE_ID"'')
if [ "$(echo $WRAPPED_VAULT_TOKEN_JSON | jq '.error')" != "null" ]; then
    echo "Exit: Error detected"
    echo $WRAPPED_VAULT_TOKEN_JSON | jq '.'
    exit 1
fi
WRAPPED_VAULT_TOKEN=$(echo $WRAPPED_VAULT_TOKEN_JSON | jq -r '.wrap_info.token')
echo "::add-mask::$WRAPPED_VAULT_TOKEN"

echo "===> Unwrap token"
echo $VAULT_ADDR/v1/sys/wrapping/unwrap
VAULT_TOKEN_JSON=$(curl -s -X POST $VAULT_ADDR/v1/sys/wrapping/unwrap -H 'X-Vault-Token: '"$WRAPPED_VAULT_TOKEN"'')

VAULT_TOKEN=$(echo -n $VAULT_TOKEN_JSON | jq -r '.auth.client_token')
echo "::add-mask::$VAULT_TOKEN"
echo "VAULT_TOKEN=$VAULT_TOKEN" >> $GITHUB_ENV