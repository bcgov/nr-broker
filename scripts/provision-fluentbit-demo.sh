#!/usr/bin/env bash
cd "${0%/*}"

INSTALL_VERSION="12.0.3"

echo "===> Intention open"
# Open intention
RESPONSE=$(curl -s -X POST $BROKER_URL/v1/intention/open?ttl=30 \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $BROKER_JWT" \
    -d @<(cat provision-fluentbit-intention.json | \
        jq ".event.url=\"http://sample.com/job\" | \
            .user.id=\"$(whoami)\" | \
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

echo "===> Jenkins provision"

# Get token for provisioning Jenkins vault token
JENKINS_INTENTION_TOKEN=$(echo $RESPONSE | jq -r '.actions.login.token')
echo "JENKINS_INTENTION_TOKEN: $JENKINS_INTENTION_TOKEN"

# Provision token for application to login as itself to Vault
JENKINS_VAULT_TOKEN=$(curl -s -X POST $BROKER_URL/v1/provision/token/self -H 'X-Broker-Token: '"$JENKINS_INTENTION_TOKEN"'' -H 'X-Vault-Role-Id: '"$CONFIG_ROLE_ID"'')
echo "$BROKER_URL/v1/provision/token/self:"
echo $JENKINS_VAULT_TOKEN | jq '.'

# Not shown: Use Vault Token to retreive login information for server & install package (No provisioning required)

echo "===> Fluent Bit provision"

# Get token for provisioning a Fluentbit deployment
FLUENTBIT_INTENTION_TOKEN=$(echo $RESPONSE | jq -r '.actions.provision.token')
echo "FLUENTBIT_INTENTION_TOKEN: $FLUENTBIT_INTENTION_TOKEN"

# Get secret id for fluentbit provisioning
FLUENTBIT_SECRET_ID=$(curl -s -X POST $BROKER_URL/v1/provision/approle/secret-id -H 'X-Broker-Token: '"$FLUENTBIT_INTENTION_TOKEN"'' -H 'X-Vault-Role-Id: '"$PROVISION_ROLE_ID"'')
echo "$BROKER_URL/v1/provision/approle/secret-id:"
echo $FLUENTBIT_SECRET_ID | jq '.'

# Not shown: Provision fluentbit service with Vault Token

# UNWRAPPED_VAULT_TOKEN=$(curl -s -X POST $VAULT_ADDR/v1/sys/wrapping/unwrap -d '{"token": "hvs.CAESIOqIlFWlH5w6NCPt93URqB3i6DACaiwmOX_ICmyeBPMUGh4KHGh2cy5rdEtpOWx0ZmFWRW1KaFVZajh4MlFYOWQ"}' -H 'Content-Type: application/json')
# curl -s -X GET $VAULT_ADDR/v1/cubbyhole/response -H 'X-VAULT-Token: '""'


echo "===> Intention close"

# Use saved intention token to close intention
curl -s -X POST $BROKER_URL/v1/intention/close -H 'X-Broker-Token: '"$INTENTION_TOKEN"''
