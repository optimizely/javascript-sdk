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
import { dependencies } from './package.json';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from  'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';

const BUILD_ALL = process.env.BUILD_ALL ? true : false;
const BUILD_UMD_BUNDLE = process.env.BUILD_UMD_BUNDLE ? true : false;

const getCjsConfigForPlatform = (platform) => {
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
      plugins: [ terser() ]
    }
  };
};

const esModuleConfig = {
  ... getCjsConfigForPlatform('browser'),
  output: {
    exports: 'named',
    format: 'es',
    file: 'dist/optimizely.browser.es.min.js',
    plugins: [ terser() ]
  }
}

const umdconfig = {
  plugins: [
    resolve({ browser: true }),
    commonjs({
      namedExports: {
        '@optimizely/js-sdk-logging': [
          'ConsoleLogHandler',
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
      }
    }),
  ],
  input: 'lib/index.browser.js',
  output: [
    {
      name: 'optimizelySdk',
      format: 'umd',
      file: 'dist/optimizely.browser.umd.js',
      exports: 'named',
    },
    {
      name: 'optimizelySdk',
      format: 'umd',
      file: 'dist/optimizely.browser.umd.min.js',
      exports: 'named',
      plugins: [ terser() ],
    },
  ],
};

export default [
  BUILD_ALL && getCjsConfigForPlatform('node'),
  BUILD_ALL && getCjsConfigForPlatform('browser'),
  BUILD_ALL && getCjsConfigForPlatform('react_native'),
  BUILD_ALL && esModuleConfig,
  (BUILD_ALL || BUILD_UMD_BUNDLE) && umdconfig,
].filter(config => config);
