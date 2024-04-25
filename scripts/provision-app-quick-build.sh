#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

PACKAGE_BUILD_VERSION=$(git rev-parse --verify HEAD)
PACKAGE_VERSION="12.0.3"
sha256=($(echo $RANDOM $RANDOM $RANDOM | shasum -a 256))

echo "===> Intention open"
# Open intention
RESPONSE=$(curl -s -X POST $BROKER_URL/v1/intention/open?ttl=30\&quickstart=true \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $BROKER_JWT" \
    -d @<(cat provision-app-quick-build.json | \
        jq ".event.url=\"http://sample.com/job\" | \
            .user.name=\"hgoddard@idp\" | \
            (.actions[] | select(.id == \"build\") .package.buildVersion) |= \"$PACKAGE_BUILD_VERSION\" | \
            (.actions[] | select(.id == \"build\") .package.version) |= \"$PACKAGE_VERSION\" \
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
INTENTION_ID=$(echo $RESPONSE | jq -r '.id')
echo -n $INTENTION_ID > provision-app-quick-build.intention.id
# echo "Hashed transaction.id: $(echo -n $INTENTION_TOKEN | shasum -a 256)"

echo "===> Build"

# Not shown: Build superapp and create artifact
echo "===> ..."
echo "===> Build - Success!"
# Patch action with build info
ACTIONS_BUILD_TOKEN=$(echo $RESPONSE | jq -r '.actions.build.token')
RESPONSE=$(curl -s -X POST $BROKER_URL/v1/intention/action/patch \
        -H 'Content-Type: application/json' \
        -H 'X-Broker-Token: '"$ACTIONS_BUILD_TOKEN"'' \
        -d '{"package":{"checksum": "sha256:'$sha256'", "size": '$RANDOM', "type": "zip" }}' \
    )
echo $RESPONSE | jq '.'
if [ "$(echo $RESPONSE | jq '.error')" != "null" ]; then
    # Use saved intention token to close intention
    echo "Exit: Error detected"
    exit 0
fi

echo "===> Intention close"

# Use saved intention token to close intention
curl -s -X POST $BROKER_URL/v1/intention/close -H 'X-Broker-Token: '"$INTENTION_TOKEN"''

echo -n $sha256 > provision-app-quick-build.artifact.sha256
echo "sha256: $sha256"
