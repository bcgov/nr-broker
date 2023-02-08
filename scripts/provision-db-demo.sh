#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

INSTALL_VERSION="12.0.3"

echo "===> Intention open"
# Open intention
RESPONSE=$(curl -s -X POST $BROKER_URL/v1/intention/open \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $BROKER_JWT" \
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

# Start db action
# curl -s -X POST $BROKER_URL/v1/intention/action/start -H 'X-Broker-Token: '"$DB_INTENTION_TOKEN"''

# Get wrapped id for db access
VAULT_TOKEN_WRAP=$(curl -s -X POST $BROKER_URL/v1/provision/token/self -H 'X-Broker-Token: '"$DB_INTENTION_TOKEN"'' -H 'X-Vault-Role-Id: '"$PROVISION_ROLE_ID"'')
echo "$BROKER_URL/v1/provision/token/self:"
echo $VAULT_TOKEN_WRAP | jq '.'
WRAPPED_VAULT_TOKEN=$(echo $VAULT_TOKEN_WRAP | jq -r '.wrap_info.token')
echo $WRAPPED_VAULT_TOKEN

UNWRAPPED_VAULT_TOKEN=$(curl -s -X POST $VAULT_ADDR/v1/sys/wrapping/unwrap -H 'X-Vault-Token: '"$WRAPPED_VAULT_TOKEN"'')
# echo $UNWRAPPED_VAULT_TOKEN | jq '.'

# Not shown: Use Vault Token to access database -- Lookup self to hit Vault API with token
RESPONSE=$(curl -s -X GET $VAULT_ADDR/v1/auth/token/lookup-self -H 'X-Vault-Token: '"$(echo -n $UNWRAPPED_VAULT_TOKEN | jq -r '.auth.client_token')"'')
# echo $RESPONSE

echo "===> Intention close"

# End db action
curl -s -X POST $BROKER_URL/v1/intention/action/end -H 'X-Broker-Token: '"$DB_INTENTION_TOKEN"''

# Use saved intention token to close intention
# curl -s -X POST $BROKER_URL/v1/intention/close -H 'X-Broker-Token: '"$INTENTION_TOKEN"''
