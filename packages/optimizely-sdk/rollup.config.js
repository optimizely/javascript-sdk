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
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve'
import { terser } from  'rollup-plugin-terser'
import { dependencies } from './package.json';

const getConfigForPlatform = (platform) => {
  return {
    plugins: [
      resolve(),
      commonjs(),
    ],
    external: ['https', 'http', 'url'].concat(Object.keys(dependencies || {})),
    input: `lib/index.${platform}.js`,
    output: {
      exports: 'named',
      format: 'cjs',
      file: `dist/optimizely.${platform}.min.js`,
      plugins: [terser()]
    }
  };
};

const namedExports = {
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
};

const getConfigForUMD = (env) => {
  return {
    plugins: [
      resolve({ browser: true }),
      commonjs({ namedExports: namedExports }),
    ],
    input: 'lib/index.browser.js',
    output: {
      name: 'optimizelySdk',
      format: 'umd',
      file: `dist/optimizely.browser.umd${ env === 'production' ? '.min' : '' }.js`,
      exports: 'named',
      plugins: [ env === 'production' ? terser() : null ]
    },
  }
};

export default [
  getConfigForPlatform('node'),
  getConfigForPlatform('browser'),
  getConfigForPlatform('react_native'),
  getConfigForUMD('development'),
  getConfigForUMD('production'),
];
