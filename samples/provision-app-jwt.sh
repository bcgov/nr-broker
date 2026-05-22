#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

INSTALL_VERSION="12.0.3"

validate_jwt() {
    local jwt_token="$1"
    (
        cd ../api && JWT_TOKEN="$jwt_token" BROKER_URL="$BROKER_URL" node --input-type=module <<'NODE'
import { createRemoteJWKSet, jwtVerify } from 'jose';

const token = process.env.JWT_TOKEN;
const brokerUrl = (process.env.BROKER_URL ?? '').replace(/\/$/, '');
const jwksUrl = new URL(`${brokerUrl}/.well-known/jwks.json`);

try {
  const jwks = createRemoteJWKSet(jwksUrl);
  const { protectedHeader, payload } = await jwtVerify(token, jwks, {
    issuer: brokerUrl,
    audience: 'vault',
  });

  console.log(JSON.stringify({
    valid: true,
    kid: protectedHeader.kid,
    sub: payload.sub,
    exp: payload.exp,
    iat: payload.iat,
    nbf: payload.nbf,
  }, null, 2));
} catch (error) {
  console.error(error);
  process.exit(1);
}
NODE
    )
}

echo "===> Intention open"
# Open intention
RESPONSE=$(curl -s -X POST $BROKER_URL/v1/intention/open?ttl=30 \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $BROKER_JWT" \
    -d @<(cat provision-app-jwt.json | \
        jq ".event.url=\"http://sample.com/job\" | \
            .user.name=\"hgoddard@idp\" | \
            (.actions[] | select(.id == \"install\") .package.version) |= \"$INSTALL_VERSION\" \
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

# echo "===> Backend installation"

# # Get token for provisioning a db access
# ACTIONS_INSTALL_TOKEN=$(echo $RESPONSE | jq -r '.actions.install.token')
# echo "ACTIONS_INSTALL_TOKEN: $ACTIONS_INSTALL_TOKEN"

# # Start install action
# curl -s -X POST $BROKER_URL/v1/intention/action/start -H 'X-Broker-Token: '"$ACTIONS_INSTALL_TOKEN"''

# # Not shown: Install superapp backend

# # End install action
# curl -s -X POST $BROKER_URL/v1/intention/action/end -H 'X-Broker-Token: '"$ACTIONS_INSTALL_TOKEN"''

echo "===> Backend JWT provision"

# Get token for provisioning backend with a signed JWT
ACTIONS_PROVISION_TOKEN=$(echo $RESPONSE | jq -r '.actions.provision.token')
echo "ACTIONS_PROVISION_TOKEN: $ACTIONS_PROVISION_TOKEN"

# Start provision action
curl -s -X POST $BROKER_URL/v1/intention/action/start -H 'X-Broker-Token: '"$ACTIONS_PROVISION_TOKEN"''

# Provision a JWT for the backend to authenticate itself
JWT_RESPONSE=$(curl -s -X POST "$BROKER_URL/v1/provision/token/jwt?ttl=30" -H 'X-Broker-Token: '"$ACTIONS_PROVISION_TOKEN"'')
echo "$BROKER_URL/v1/provision/token/jwt:"
echo $JWT_RESPONSE | jq '.'
if [ "$(echo $JWT_RESPONSE | jq '.error')" != "null" ]; then
    echo "Exit: Error detected"
    exit 0
fi

JWT_TOKEN=$(echo $JWT_RESPONSE | jq -r '.token')
echo "JWT_TOKEN: $JWT_TOKEN"

echo "===> Validate JWT against JWKS"
validate_jwt "$JWT_TOKEN"

echo "===> End provision action"
curl -s -X POST $BROKER_URL/v1/intention/action/end -H 'X-Broker-Token: '"$ACTIONS_PROVISION_TOKEN"''

echo "===> Intention close"

# Use saved intention token to close intention
curl -s -X POST $BROKER_URL/v1/intention/close -H 'X-Broker-Token: '"$INTENTION_TOKEN"''
