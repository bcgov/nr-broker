#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

INSTALL_VERSION="12.0.3"

echo "===> Intention open"
# Open intention
RESPONSE=$(curl -s -X POST $BROKER_URL/v1/intention/open?ttl=30 \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $BROKER_JWT" \
    -d @<(cat provision-app-backend-intention.json | \
        jq ".event.url=\"http://sample.com/job\" | \
            .user.id=\"$(whoami)@idir\" | \
            (.actions[] | select(.id == \"install\") .service.version) |= \"$INSTALL_VERSION\" \
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

echo "===> Backend installation"

# Get token for provisioning a db access
ACTIONS_INSTALL_TOKEN=$(echo $RESPONSE | jq -r '.actions.install.token')
echo "ACTIONS_INSTALL_TOKEN: $ACTIONS_INSTALL_TOKEN"

# Start install action
curl -s -X POST $BROKER_URL/v1/intention/action/start -H 'X-Broker-Token: '"$ACTIONS_INSTALL_TOKEN"''

# Not shown: Install superapp backend

# End install action
curl -s -X POST $BROKER_URL/v1/intention/action/end -H 'X-Broker-Token: '"$ACTIONS_INSTALL_TOKEN"''

echo "===> Backend provision"

# Get token for provisioning backend with vault token
ACTIONS_PROVISION_TOKEN=$(echo $RESPONSE | jq -r '.actions.provision.token')
echo "ACTIONS_PROVISION_TOKEN: $ACTIONS_PROVISION_TOKEN"

# Start provision action
curl -s -X POST $BROKER_URL/v1/intention/action/start -H 'X-Broker-Token: '"$ACTIONS_PROVISION_TOKEN"''

# Provision token for application to login as itself to Vault
BACKEND_SECRET_ID=$(curl -s -X POST $BROKER_URL/v1/provision/approle/secret-id -H 'X-Broker-Token: '"$ACTIONS_PROVISION_TOKEN"'' -H 'X-Vault-Role-Id: '"$SUPERAPP_BACKEND_ROLE_ID"'')
echo "$BROKER_URL/v1/provision/approle/secret-id:"
echo $BACKEND_SECRET_ID | jq '.'

# Not shown: Provision fluentbit service with Vault Token

# UNWRAPPED_VAULT_TOKEN=$(curl -s -X POST $VAULT_ADDR/v1/sys/wrapping/unwrap -d '{"token": "hvs.CAESIOqIlFWlH5w6NCPt93URqB3i6DACaiwmOX_ICmyeBPMUGh4KHGh2cy5rdEtpOWx0ZmFWRW1KaFVZajh4MlFYOWQ"}' -H 'Content-Type: application/json')
# curl -s -X GET $VAULT_ADDR/v1/cubbyhole/response -H 'X-VAULT-Token: '""'

# End provision action
curl -s -X POST $BROKER_URL/v1/intention/action/end -H 'X-Broker-Token: '"$ACTIONS_PROVISION_TOKEN"''

echo "===> Intention close"

# Use saved intention token to close intention
curl -s -X POST $BROKER_URL/v1/intention/close -H 'X-Broker-Token: '"$INTENTION_TOKEN"''
