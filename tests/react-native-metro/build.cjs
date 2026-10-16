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

// Builds one bundle of app/index.js with a fixture's Metro.
// Usage: RN_METRO_TEST_MODULES='{...}' node build.cjs <fixtureDir> <outFile>
// Runs in its own process so each bundle gets a fresh Metro config.

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const [fixtureArg, outArg] = process.argv.slice(2);
const fixtureDir = fs.realpathSync(fixtureArg);
const fixtureRequire = createRequire(path.join(fixtureDir, 'package.json'));
const Metro = fixtureRequire('metro');
const { loadConfig } = fixtureRequire('metro-config');

(async () => {
  // Load through metro-config, as the React Native CLI does; it fills in the rest of the config.
  const config = await loadConfig({ cwd: fixtureDir, config: path.join(fixtureDir, 'metro.config.js') });
  await Metro.runBuild(config, {
    entry: path.join(fs.realpathSync(__dirname), 'app', 'index.js'),
    platform: 'ios',
    dev: false,
    minify: false,
    out: path.resolve(outArg),
  });
})().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
