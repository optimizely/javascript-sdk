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
import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import { dependencies } from './package.json';
import typescript from 'rollup-plugin-typescript2';

const typescriptPluginOptions = {
  allowJs: true,
  exclude: [
    './dist',
    './lib/**/*.tests.js',
    './lib/**/*.tests.ts',
    './lib/**/*.umdtests.js',
    './lib/tests',
    'node_modules'
  ],
  include: [
    './lib/**/*.ts',
    './lib/**/*.js'
  ],
};

const cjsBundleFor = (platform) => ({
  plugins: [
    resolve(),
    commonjs(),
    typescript(typescriptPluginOptions),
  ],
  external: ['https', 'http', 'url'].concat(Object.keys(dependencies || {})),
  input: `lib/index.${platform}.js`,
  output: {
    exports: 'named',
    format: 'cjs',
    file: `dist/optimizely.${platform}.min.js`,
    plugins: [terser()],
    sourcemap: true,
  },
});

const esmBundle = {
  ...cjsBundleFor('browser'),
  output: [
    {
      format: 'es',
      file: 'dist/optimizely.browser.es.js',
      sourcemap: true,
    },
    {
      format: 'es',
      file: 'dist/optimizely.browser.es.min.js',
      plugins: [terser()],
      sourcemap: true,
    },
  ],
};

const umdBundle = {
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
          'getErrorHandler',
        ],
        '@optimizely/js-sdk-event-processor': ['LogTierV1EventProcessor', 'LocalStoragePendingEventsDispatcher'],
      },
    }),
    typescript(typescriptPluginOptions),
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
      plugins: [terser()],
      sourcemap: true,
    },
  ],
};

// A separate bundle for json schema validator.
const jsonSchemaBundle = {
  plugins: [
    resolve(),
    commonjs(),
    typescript(typescriptPluginOptions),
  ],
  external: ['json-schema', '@optimizely/js-sdk-utils'],
  input: 'lib/utils/json_schema_validator/index.ts',
  output: {
    exports: 'named',
    format: 'cjs',
    file: 'dist/optimizely.json_schema_validator.min.js',
    plugins: [terser()],
    sourcemap: true,
  },
};

const bundles = {
  'cjs-node': cjsBundleFor('node'),
  'cjs-browser': cjsBundleFor('browser'),
  'cjs-react-native': cjsBundleFor('react_native'),
  esm: esmBundle,
  'json-schema': jsonSchemaBundle,
  umd: umdBundle,
};

// Collect all --config-* options and return the matching bundle configs
// Builds all bundles if no --config-* option given
//   --config-cjs will build all three cjs-* bundles
//   --config-umd will build only the umd bundle
//   --config-umd --config-json will build both umd and the json-schema bundles
export default (args) => {
  const patterns = Object.keys(args)
    .filter((arg) => arg.startsWith('config-'))
    .map((arg) => arg.replace(/config-/, ''));

  // default to matching all bundles
  if (!patterns.length) patterns.push(/.*/);

  return Object.entries(bundles)
    .filter(([name, config]) => patterns.some((pattern) => name.match(pattern)))
    .map(([name, config]) => config);
};
