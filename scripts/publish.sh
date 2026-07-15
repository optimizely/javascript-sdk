#!/usr/bin/env bash
#
# Registry-agnostic, idempotent publish for @optimizely/optimizely-sdk.
#
# Usage:
#   scripts/publish.sh <registry-url> <tarball> <dist-tag>
#
# Args:
#   registry-url  Target registry, e.g. https://registry.npmjs.org
#                 or https://npm.pkg.github.com
#   tarball       Prebuilt package tarball (output of `npm pack`) to publish.
#                 The release flow packs it once and publishes the same bytes to
#                 both registries; the backfill packs each version from npm.
#   dist-tag      npm dist-tag to publish under. The caller decides the tag; this
#                 script is deliberately tag-agnostic so the JS SDK keeps its
#                 existing tag logic in the workflow (latest / v{major}-latest /
#                 beta / alpha / rc).
#
# Env:
#   NODE_AUTH_TOKEN  Auth token for the target registry. An .npmrc entry must
#                    reference it for <registry-url>'s host, e.g.
#                    `//<host>/:_authToken=${NODE_AUTH_TOKEN}` (setup-node writes
#                    this for npm; the workflow adds one for GitHub Package
#                    Registry). We pass --registry explicitly, so no
#                    scope-to-registry routing is needed (and the @optimizely
#                    scope is intentionally NOT routed to GPR, so `npm ci` still
#                    installs dependencies from npm).
#   DRY_RUN          When "true", report the action (publish vs. skip) without
#                    actually publishing.
#
# Behavior:
#   - Skips (exit 0) if the version already exists on the target registry, so
#     re-running a release or the backfill is always a safe no-op.
#   - Publishes the prebuilt tarball with --ignore-scripts so lifecycle scripts
#     (prepublishOnly = test, prepare = build) don't re-run from package.json.
set -euo pipefail

registry="${1:?usage: publish.sh <registry-url> <tarball> <dist-tag>}"
tarball="${2:?usage: publish.sh <registry-url> <tarball> <dist-tag>}"
tag="${3:?usage: publish.sh <registry-url> <tarball> <dist-tag>}"
dry_run="${DRY_RUN:-false}"

# Derive name/version from the tarball's own package.json so the existence guard
# matches exactly what we're about to publish.
meta=$(tar -xzO -f "$tarball" package/package.json)
pkg=$(printf '%s' "$meta" | jq -r '.name')
version=$(printf '%s' "$meta" | jq -r '.version')

if npm view "${pkg}@${version}" version --registry "$registry" >/dev/null 2>&1; then
  echo "Version ${pkg}@${version} already on ${registry}, skipping."
  exit 0
fi

if [[ "$dry_run" == "true" ]]; then
  echo "[dry-run] would publish ${pkg}@${version} (tag: ${tag}) to ${registry}"
  exit 0
fi

echo "Publishing ${pkg}@${version} (tag: ${tag}) to ${registry}"
npm publish "$tarball" --registry "$registry" --tag "$tag" --ignore-scripts
