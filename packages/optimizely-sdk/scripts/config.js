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
const resolve = require('rollup-plugin-node-resolve')

function getPlugins (env){
  const plugins = [
    resolve({
      browser: true,
    }),
    commonjs({
      namedExports: { '@optimizely/js-sdk-logging':
          [
            'getLogger',
            'setLogLevel',
            'LogLevel',
            'setLogHandler',
            'setErrorHandler',
            'getErrorHandler'
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
  external: ['https', 'http', 'url', 'crypto'],
  output: {
    exports: 'named',
  }
}
