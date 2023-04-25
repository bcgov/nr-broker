#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

source ./setenv-common.sh local
if [ $? != 0 ]; then [ $PS1 ] && return || exit; fi

mongosh -u mongoadmin -p secret --authenticationDatabase admin brokerDB mongo-setup.js
if test -f "mongo-setup-ext.js"; then
    mongosh -u mongoadmin -p secret --authenticationDatabase admin brokerDB mongo-setup-ext.js
fi