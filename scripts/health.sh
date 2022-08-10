#!/bin/bash

cd "${0%/*}"

curl -X GET http://localhost:3000/health -H 'Content-Type: application/json'
