#!/usr/bin/env node

/**
 * Copyright 2026, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Prints the newest npm <major>.x release that is at least <min-age-days> days old.
//
// CI installs npm using the npm that comes with Node.js, which doesn't support the
// min-release-age setting in .npmrc, so this applies the same rule to npm itself. The
// minimum age defaults to min-release-age in the repo's .npmrc, or 7 days if that
// isn't set. Pre-releases and
// deprecated versions are skipped.
//
// Usage: node scripts/pick-npm-version.js <major> [min-age-days]

const fs = require('fs');
const path = require('path');

const REGISTRY = 'https://registry.npmjs.org';
const DAY_MS = 24 * 60 * 60 * 1000;
// Used if .npmrc has no min-release-age, so a missing setting doesn't let CI
// install an npm release published minutes ago.
const DEFAULT_MIN_AGE_DAYS = 7;

function readMinReleaseAge() {
  const npmrc = fs.readFileSync(path.join(__dirname, '..', '.npmrc'), 'utf8');
  const match = npmrc.match(/^\s*min-release-age\s*=\s*(\d+)\s*$/m);
  if (!match) {
    console.error(`min-release-age is not set in .npmrc; using ${DEFAULT_MIN_AGE_DAYS} days.`);
    return DEFAULT_MIN_AGE_DAYS;
  }
  return Number(match[1]);
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) {
      return pa[i] - pb[i];
    }
  }
  return 0;
}

async function main() {
  const [majorArg, minAgeArg] = process.argv.slice(2);
  if (!/^\d+$/.test(majorArg || '') || (minAgeArg !== undefined && !/^\d+$/.test(minAgeArg))) {
    console.error('Usage: node scripts/pick-npm-version.js <major> [min-age-days]');
    process.exit(2);
  }
  const major = Number(majorArg);
  const minAgeDays = minAgeArg !== undefined ? Number(minAgeArg) : readMinReleaseAge();
  const cutoff = Date.now() - minAgeDays * DAY_MS;

  // The full metadata document: the abbreviated one has no publish times.
  const response = await fetch(`${REGISTRY}/npm`, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`GET ${REGISTRY}/npm failed: ${response.status} ${response.statusText}`);
  }
  const { versions, time } = await response.json();

  const candidates = Object.keys(versions)
    .filter((version) => /^\d+\.\d+\.\d+$/.test(version) && Number(version.split('.')[0]) === major)
    .filter((version) => !versions[version].deprecated)
    .filter((version) => time[version] && Date.parse(time[version]) <= cutoff)
    .sort(compareVersions);

  if (candidates.length === 0) {
    console.error(`No npm ${major}.x release is at least ${minAgeDays} day(s) old.`);
    process.exit(1);
  }
  console.log(candidates[candidates.length - 1]);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
