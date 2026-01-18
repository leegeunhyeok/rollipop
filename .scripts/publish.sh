#!/bin/bash

set -e

if [ -z "$1" ]; then
  echo "No tag provided. using latest"
  publish_tag="latest"
else
  publish_tag=$1
fi

echo "Publishing with tag: $publish_tag"

# Publish @rollipop/*
yarn workspaces foreach --all --no-private --include="@rollipop/*" exec yarn npm publish --provenance --access public --tolerate-republish --tag $publish_tag

# FIXME
# When deploying with yarn workspaces foreach, an OIDC authentication error occurs only in the `rollipop` package.
# Therefore, as a temporary measure, this package will be deployed separately using the npm command.
version=$(cat packages/rollipop/package.json | jq -r '.version')
if ! yarn npm info rollipop@$version --fields version --json | jq -r '.version' | grep -q $version; then
  yarn workspace rollipop pack --out package.tgz
  npm publish packages/rollipop/package.tgz --tag $publish_tag --provenance
else
  echo "rollipop@$version is already published"
fi
