#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

if [ ! -f "./setenv-common.sh" ]; then
    echo "Error: /scripts/setenv-common.sh not found! Have you followed your team's setup instructions?"
    [ $PS1 ] && return || exit
fi

source ./setenv-common.sh local
if [ $? != 0 ]; then [ $PS1 ] && return || exit; fi

mongosh -u mongoadmin -p secret --authenticationDatabase admin brokerDB db/mongo-setup.js
if test -f "db/mongo-setup-ext.js"; then
    mongosh -u mongoadmin -p secret --authenticationDatabase admin brokerDB db/mongo-setup-ext.js
else
    mongosh -u mongoadmin -p secret --authenticationDatabase admin brokerDB db/mongo-setup-sample.js
fi
