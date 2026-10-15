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

// Metro config shared by the fixtures. Each fixture's metro.config.js passes in its own
// @react-native/metro-config, so bundles are built the way that React Native version builds an app.
// Which optional packages are installed is set per bundle through RN_METRO_TEST_MODULES (see build.cjs).

const fs = require('fs');
const path = require('path');

const ROOT = fs.realpathSync(__dirname);
const STUBS = path.join(ROOT, 'stubs');
const SDK_DIR = path.join(ROOT, '.sdk');

module.exports = (fixtureDir, { getDefaultConfig, mergeConfig }) => {
  const projectRoot = fs.realpathSync(fixtureDir);
  const modules = JSON.parse(process.env.RN_METRO_TEST_MODULES || '{}');

  // Optional packages: a file to resolve to when "installed", null when missing. A missing package fails
  // to resolve, so Metro handles it like a package that isn't installed.
  const optionalPackages = {
    'fast-text-encoding': modules.fastTextEncoding
      ? require.resolve('fast-text-encoding', { paths: [projectRoot] })
      : null,
    'react-native-get-random-values': modules.getRandomValues
      ? path.join(STUBS, 'react-native-get-random-values.js')
      : null,
    '@react-native-async-storage/async-storage': modules.asyncStorage
      ? path.join(STUBS, `async-storage-${modules.asyncStorage}.js`)
      : null,
  };

  return mergeConfig(getDefaultConfig(projectRoot), {
    watchFolders: [path.join(ROOT, 'app'), STUBS, SDK_DIR],
    reporter: { update: () => {} },
    resolver: {
      useWatchman: false,
      // app/, stubs/ and .sdk/ are outside the fixture; packages their transformed code needs (such as
      // @babel/runtime helpers added by React Native's Babel preset) come from the fixture's node_modules.
      nodeModulesPaths: [path.join(projectRoot, 'node_modules')],
      resolveRequest(context, moduleName, platform) {
        if (Object.prototype.hasOwnProperty.call(optionalPackages, moduleName)) {
          const filePath = optionalPackages[moduleName];
          if (!filePath) {
            throw new Error(`[rn-metro-test] '${moduleName}' is not installed in this case`);
          }
          return { type: 'sourceFile', filePath };
        }
        if (moduleName === '@react-native-community/netinfo') {
          return { type: 'sourceFile', filePath: path.join(STUBS, 'netinfo.js') };
        }
        if (moduleName === 'react-native' || moduleName.startsWith('react-native/')) {
          throw new Error(`[rn-metro-test] '${moduleName}' needs native code and must not be bundled`);
        }
        if (moduleName === '@optimizely/optimizely-sdk') {
          // Resolve the SDK the way an app does (package.json fields, exports), from the install in .sdk.
          return context.resolveRequest(
            { ...context, originModulePath: path.join(SDK_DIR, 'index.js') },
            moduleName,
            platform,
          );
        }
        return context.resolveRequest(context, moduleName, platform);
      },
    },
    serializer: {
      // React Native's startup module (InitializeCore / setup-env) needs native code. Its JS polyfills,
      // including ErrorUtils, are still bundled through getPolyfills.
      getModulesRunBeforeMainModule: () => [],
    },
  });
};
