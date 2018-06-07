#!/bin/sh -e

npm run lint
grunt jsdoc2md

if ! git diff --exit-code; then
  echo "Some files need to be checked in"
  exit 1
fi

npm run test
grunt karma
