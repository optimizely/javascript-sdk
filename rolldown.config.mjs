/**
 * Copyright 2020-2022, 2025-2026 Optimizely
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

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);
const { dependencies, peerDependencies } = require('./package.json');

const aliasEntries = {
  'error_message': join(__dirname, '.build/message/error_message.gen.js'),
  'log_message': join(__dirname, '.build/message/log_message.gen.js'),
};

const externalDeps = ['https', 'http', 'url'].concat(Object.keys({ ...dependencies, ...peerDependencies } || {}));

// uuid@13 is ESM-only and does not provide a CommonJS export.
// Since our CJS bundles must work in CommonJS environments, we bundle uuid
// into the CJS output instead of leaving it as an external dependency.
const externalDepsWithoutUuid = externalDeps.filter(dep => dep !== 'uuid');

const resolveForPlatform = (platform) => {
  const base = { alias: aliasEntries };
  switch (platform) {
    case 'node':
      return { ...base, conditionNames: ['node', 'import', 'module', 'require', 'default'] };
    case 'browser':
      return {
        ...base,
        conditionNames: ['browser', 'import', 'module', 'require', 'default'],
        mainFields: ['browser', 'module', 'main'],
      };
    case 'react_native':
      return {
        ...base,
        conditionNames: ['react-native', 'import', 'module', 'require', 'default'],
        mainFields: ['react-native', 'module', 'main'],
      };
    default:
      return base;
  }
};

const cjsBundleFor = (platform, opt = {}) => {
  const { minify = true, ext = '.js' } = opt;
  const min = minify ? '.min' : '';

  return {
    input: `./.build/index.${platform}.js`,
    output: {
      exports: 'named',
      format: 'cjs',
      file: `dist/index.${platform}${min}${ext}`,
      sourcemap: true,
      minify,
    },
    resolve: resolveForPlatform(platform),
    external: externalDepsWithoutUuid,
  };
};

const esmBundleFor = (platform, opt = {}) => {
  const { minify = true, ext = '.js' } = opt;
  const min = minify ? '.min' : '';

  return {
    input: `./.build/index.${platform}.js`,
    output: {
      format: 'es',
      file: `dist/index.${platform}.es${min}${ext}`,
      sourcemap: true,
      minify,
    },
    resolve: resolveForPlatform(platform),
    external: externalDeps,
  };
};

const cjsBundleForUAParser = (opt = {}) => {
  const { minify = true, ext = '.js' } = opt;
  const min = minify ? '.min' : '';

  return {
    input: `./.build/odp/ua_parser/ua_parser.js`,
    output: {
      exports: 'named',
      format: 'cjs',
      file: `dist/ua_parser${min}${ext}`,
      sourcemap: true,
      minify,
    },
    resolve: { alias: aliasEntries },
    external: externalDepsWithoutUuid,
  };
};

const esmBundleForUAParser = (opt = {}) => {
  const { minify = true, ext = '.js' } = opt;
  const min = minify ? '.min' : '';

  return {
    input: `./.build/odp/ua_parser/ua_parser.js`,
    output: {
      format: 'es',
      file: `dist/ua_parser.es${min}${ext}`,
      sourcemap: true,
      minify,
    },
    resolve: { alias: aliasEntries },
    external: externalDeps,
  };
};

const jsonSchemaBundle = {
  input: './.build/utils/json_schema_validator/index.js',
  output: {
    exports: 'named',
    format: 'cjs',
    file: 'dist/optimizely.json_schema_validator.min.js',
    sourcemap: true,
    minify: true,
  },
  resolve: { alias: aliasEntries },
  external: ['json-schema'],
};

const umdBundle = {
  input: './.build/index.browser.js',
  output: {
    name: 'optimizelySdk',
    format: 'umd',
    file: 'dist/optimizely.browser.umd.js',
    exports: 'named',
  },
  resolve: resolveForPlatform('browser'),
};

const umdMinBundle = {
  input: './.build/index.browser.js',
  output: {
    name: 'optimizelySdk',
    format: 'umd',
    file: 'dist/optimizely.browser.umd.min.js',
    exports: 'named',
    minify: true,
    sourcemap: true,
  },
  resolve: resolveForPlatform('browser'),
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
  'umd': umdBundle,
  'umd-min': umdMinBundle,
};

// Collect all --config-* options and return the matching bundle configs
// Builds all bundles if no --config-* option given
//   --config-cjs will build all cjs-* bundles
//   --config-umd will build both umd bundles
//   --config-umd --config-json will build both umd and the json-schema bundles
const patterns = process.argv
  .filter(arg => arg.startsWith('--config-'))
  .map(arg => arg.replace(/^--config-/, ''));

if (!patterns.length) patterns.push(/.*/);

export default Object.entries(bundles)
  .filter(([name]) => patterns.some(pattern => name.match(pattern)))
  .map(([, config]) => config);
