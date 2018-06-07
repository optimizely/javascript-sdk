#!/bin/sh -e

npm run lint
grunt doc

if ! git diff --exit-code; then
  echo "Some files need to be checked in"
  exit 1
fi

npm run test

npm run build
