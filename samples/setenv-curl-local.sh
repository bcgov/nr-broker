#!/usr/bin/env bash
[ -n "$ZSH_VERSION" ] && this_dir=$(dirname "${(%):-%x}") \
    || this_dir=$(dirname "${BASH_SOURCE[0]:-$0}")
cd "$this_dir"

source ../scripts/setenv-curl-local.sh
cd ../samples
