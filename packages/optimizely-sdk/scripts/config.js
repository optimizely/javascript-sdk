/**
 * Copyright 2020, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const { terser } = require('rollup-plugin-terser');
const commonjs = require('rollup-plugin-commonjs');
const resolve = require('rollup-plugin-node-resolve');
const packageDeps = require('../package.json').dependencies || {};

function getExternals(target) {
  return target !== 'umd'
    ? ['https', 'http', 'url'].concat(Object.keys(packageDeps))
    : '';
}

function getPlugins (env){
  const plugins = [
    resolve({
      browser: true,
    }),
    commonjs({
      namedExports:
        {
          '@optimizely/js-sdk-logging': [
            'getLogger',
            'setLogLevel',
            'LogLevel',
            'setLogHandler',
            'setErrorHandler',
            'getErrorHandler'
          ],
          '@optimizely/js-sdk-event-processor': [
            'LocalStoragePendingEventsDispatcher'
          ]
        },
    }),
  ];

  if (env === 'production') {
    plugins.push(terser())
  }

  return plugins;
}

module.exports = {
  plugins: getPlugins(process.env.BUILD_ENV),
  external: getExternals(process.env.TARGET),
  output: {
    globals: {
      '@optimizely/js-sdk-logging': 'logging',
      '@optimizely/js-sdk-event-processor': 'eventProcessor',
      '@optimizely/js-sdk-datafile-manager': 'datafileManager',
      '@optimizely/js-sdk-utils': 'jsSdkUtils',
      murmurhash: 'murmurhash',
      uuid: 'v4',
    },
    exports: 'named',
  }
}
