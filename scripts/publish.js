#!/usr/bin/env node

/**
 * Registry-agnostic, idempotent publish for @optimizely/optimizely-sdk.
 *
 * Usage:
 *   node scripts/publish.js <registry-url> [tarball]
 *
 * Args:
 *   registry-url  Target registry, e.g. https://registry.npmjs.org
 *                 or https://npm.pkg.github.com
 *   tarball       Optional. When given, publishes that packed tarball instead
 *                 of the current working directory.
 *
 * Env:
 *   NODE_AUTH_TOKEN  Auth token for the target registry. Used both to read the
 *                    registry (existence/dist-tag lookup) and, via the caller's
 *                    .npmrc entry, to publish. For npm registry with OIDC trusted
 *                    publishing, this may be unset — npm handles auth via OIDC
 *                    and the packument endpoint is public.
 *   DRY_RUN          When "true", report what would happen without publishing.
 *
 * Behavior:
 *   - Reads the target registry's packument once (a single HTTP GET) and:
 *       * 200 -> package exists; skip if this exact version is already present.
 *       * 404 -> package/version absent; proceed to publish.
 *       * any other status or a network failure -> abort rather than guess.
 *   - Computes the dist-tag from the version:
 *       * pre-releases (beta/alpha/rc) get their own tag, never `latest`.
 *       * a stable release gets `latest` ONLY when it is strictly greater (by
 *         semver) than the registry's current `latest`.
 *       * otherwise tagged `v<major>-last-published`.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Returns true if a > b (numeric major.minor.patch only, no pre-release handling).
function versionGt(a, b) {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const x = partsA[i] || 0;
    const y = partsB[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

// Extract name and version from tarball's embedded package.json, or from the working directory.
function getPackageInfo(tarball) {
  if (tarball) {
    const meta = execFileSync('tar', ['-xzO', '-f', tarball, 'package/package.json'], {
      encoding: 'utf-8',
    });
    const parsed = JSON.parse(meta);
    return { name: parsed.name, version: parsed.version };
  }
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
  return { name: pkg.name, version: pkg.version };
}

// Fetch the registry packument (GET /<pkg>). Auth header is included only when
// NODE_AUTH_TOKEN is set — npmjs.org is public, but GPR requires a token.
async function fetchPackument(registry, pkg, authToken) {
  const url = new URL(encodeURIComponent(pkg), registry).href;

  const headers = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  return { status: response.status, body: response };
}

// Determine the dist-tag: pre-releases get their own tag; stable releases get
// `latest` only when strictly newer than the registry's current latest, otherwise
// `v<major>-last-published` so `latest` never moves backwards.
function computeDistTag(version, currentLatest) {
  if (version.includes('-beta')) return 'beta';
  if (version.includes('-alpha')) return 'alpha';
  if (version.includes('-rc')) return 'rc';

  if (!currentLatest || versionGt(version, currentLatest)) {
    return 'latest';
  }

  const major = version.split('.')[0];
  console.log(
    `Current latest is ${currentLatest}; ${version} is not newer, tagging as v${major}-last-published (latest preserved).`
  );
  return `v${major}-last-published`;
}

async function main() {
  const args = process.argv.slice(2);
  const registry = args[0];
  const tarball = args[1] || '';

  if (!registry) {
    console.error('usage: publish.js <registry-url> [tarball]');
    process.exit(1);
  }

  const dryRun = (process.env.DRY_RUN || 'false') === 'true';
  const authToken = process.env.NODE_AUTH_TOKEN || '';

  const { name: pkg, version } = getPackageInfo(tarball);

  let packument;
  try {
    packument = await fetchPackument(registry, pkg, authToken);
  } catch (err) {
    console.error(`ERROR: ${err.message}; refusing to publish on an ambiguous result.`);
    process.exit(1);
  }

  const { status, body } = packument;
  let currentLatest = '';

  switch (status) {
    case 200: {
      let data;
      try {
        data = await body.json();
      } catch (err) {
        console.error(`ERROR: failed to parse packument JSON from ${registry}; refusing to publish on an ambiguous result.`);
        process.exit(1);
      }
      if (data.versions && data.versions[version]) {
        console.log(`Version ${pkg}@${version} already on ${registry}, skipping.`);
        process.exit(0);
      }
      currentLatest = data['dist-tags']?.latest || '';
      break;
    }
    case 404:
      currentLatest = '';
      break;
    default:
      console.error(
        `ERROR: unexpected HTTP ${status} querying ${registry}; refusing to publish on an ambiguous result.`
      );
      process.exit(1);
  }

  const tag = computeDistTag(version, currentLatest);

  if (dryRun) {
    console.log(`[dry-run] would publish ${pkg}@${version} (tag: ${tag}) to ${registry}`);
    process.exit(0);
  }

  // --provenance generates SLSA attestations via OIDC. Only npmjs.org supports it.
  const provenance = registry.includes('registry.npmjs.org') ? '--provenance' : '';

  console.log(`Publishing ${pkg}@${version} (tag: ${tag}) to ${registry}`);

  const publishArgs = tarball
    ? ['publish', tarball, '--registry', registry, '--tag', tag, '--ignore-scripts']
    : ['publish', '--registry', registry, '--tag', tag];

  if (provenance) {
    publishArgs.push(provenance);
  }

  // stdio: 'inherit' passes through the parent env, which is required for OIDC
  // (GitHub Actions injects ACTIONS_ID_TOKEN_REQUEST_* vars that npm reads).
  execFileSync('npm', publishArgs, { stdio: 'inherit' });
}

main();
