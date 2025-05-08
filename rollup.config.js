/**
 * Copyright 2020-2022 Optimizely
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
import { dependencies, peerDependencies } from './package.json';
import typescript from 'rollup-plugin-typescript2';

const typescriptPluginOptions = {
  allowJs: true,
  exclude: [
    './dist',
    './lib/**/*.tests.js',
    './lib/**/*.tests.ts',
    './lib/**/*.umdtests.js',
    './lib/tests',
    'node_modules',
  ],
  include: ['./lib/**/*.ts', './lib/**/*.js'],
  tsconfigOverride: {
    compilerOptions: {
      paths: {
        "*": [
          "./typings/*"
        ],
        "error_message": [
          "./lib/message/error_message.gen"
        ],
        "log_message": [
          "./lib/message/log_message.gen"
        ],
      }
    }
  }
};

const cjsBundleFor = (platform, opt = {}) => {
  const { minify, ext } = {
    minify: true,
    ext: '.js',
    ...opt,
  };

  const min = minify ? '.min' : '';

  return {
    plugins: [resolve(), commonjs(), typescript(typescriptPluginOptions)],
    external: ['https', 'http', 'url'].concat(Object.keys({ ...dependencies, ...peerDependencies } || {})),
    input: `lib/index.${platform}.ts`,
    output: {
      exports: 'named',
      format: 'cjs',
      file: `dist/index.${platform}${min}${ext}`,
      plugins: minify ? [terser()] : undefined,
      sourcemap: true,
    },
  }
};

const esmBundleFor = (platform, opt) => {
  const { minify, ext } = {
    minify: true,
    ext: '.js',
    ...opt,
  };

  const min = minify ? '.min' : '';

  return {
    ...cjsBundleFor(platform),
    output: [
      {
        format: 'es',
        file: `dist/index.${platform}.es${min}${ext}`,
        plugins: minify ? [terser()] : undefined,
        sourcemap: true,
      },
    ],
  }
};

const cjsBundleForUAParser = (opt = {}) => {
  const { minify, ext } = {
    minify: true,
    ext: '.js',
    ...opt,
  };

  const min = minify ? '.min' : '';

  return {
    plugins: [resolve(), commonjs(), typescript(typescriptPluginOptions)],
    external: ['https', 'http', 'url'].concat(Object.keys({ ...dependencies, ...peerDependencies } || {})),
    input: `lib/odp/ua_parser/ua_parser.ts`,
    output: {
      exports: 'named',
      format: 'cjs',
      file: `dist/ua_parser${min}${ext}`,
      plugins: minify ? [terser()] : undefined,
      sourcemap: true,
    },
  };
};

const esmBundleForUAParser = (opt = {}) => {
  const { minify, ext } = {
    minify: true,
    ext: '.js',
    ...opt,
  };

  const min = minify ? '.min' : '';

  return {
    ...cjsBundleForUAParser(),
    output: [
      {
        format: 'es',
        file: `dist/ua_parser.es${min}${ext}`,
        plugins: minify ? [terser()] : undefined,
        sourcemap: true,
      },
    ],
  };
};

const umdBundle = {
  plugins: [
    resolve({ browser: true }),
    commonjs({
      namedExports: {
        '@optimizely/js-sdk-event-processor': ['LogTierV1EventProcessor', 'LocalStoragePendingEventsDispatcher'],
        'json-schema': ['validate'],
      },
    }),
    typescript(typescriptPluginOptions),
  ],
  input: 'lib/index.browser.ts',
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
  plugins: [resolve(), commonjs(), typescript(typescriptPluginOptions)],
  external: ['json-schema', 'uuid'],
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
  'cjs-node-min': cjsBundleFor('node'),
  'cjs-browser-min': cjsBundleFor('browser'),
  'cjs-react-native-min': cjsBundleFor('react_native'),
  'cjs-universal': cjsBundleFor('universal'),
  'esm-browser-min': esmBundleFor('browser'),
  'esm-node-min': esmBundleFor('node', { ext: '.mjs' }),
  'esm-react-native-min': esmBundleFor('react_native'),
  'esm-universal': esmBundleFor('universal'),
  'json-schema': jsonSchemaBundle,
  'cjs-ua-parser-min': cjsBundleForUAParser(),
  'esm-ua-parser-min': esmBundleForUAParser(),
  umd: umdBundle,
};

// Collect all --config-* options and return the matching bundle configs
// Builds all bundles if no --config-* option given
//   --config-cjs will build all three cjs-* bundles
//   --config-umd will build only the umd bundle
//   --config-umd --config-json will build both umd and the json-schema bundles
export default args => {
  const patterns = Object.keys(args)
    .filter(arg => arg.startsWith('config-'))
    .map(arg => arg.replace(/config-/, ''));

  // default to matching all bundles
  if (!patterns.length) patterns.push(/.*/);

  return Object.entries(bundles)
    .filter(([name, config]) => patterns.some(pattern => name.match(pattern)))
    .map(([name, config]) => config);
};
