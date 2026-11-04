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
import { readdirSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

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

// React Native optional import shims (lib/import.react_native) are not bundled into the main bundles.
// Each is shipped as its own module at the same relative location in dist, because Metro before 0.82.5
// shifts every later require in a module when an optional dependency is missing.
// See lib/import.react_native/README.md.
const BUILD_DIR = join(__dirname, '.build');
const RN_IMPORT_SHIM_DIR = 'import.react_native';

// Shim paths relative to the shim directory, without extension. Shims are named after their package, so
// a scoped package's shim is in a subdirectory, e.g. '@react-native-async-storage/async-storage'.
const listShims = (subdir = '') =>
  readdirSync(join(__dirname, 'lib', RN_IMPORT_SHIM_DIR, subdir), { withFileTypes: true }).flatMap(entry => {
    const path = subdir ? `${subdir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return listShims(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [path.replace(/\.ts$/, '')] : [];
  });
const RN_IMPORT_SHIMS = listShims();

// Leaves shim imports out of the main bundles and writes them as a path relative to the bundle, e.g.
//   import '../../../import.react_native/@react-native-async-storage/async-storage'   (from a file deep in .build)
//   -> require("./import.react_native/@react-native-async-storage/async-storage.js")  (in dist/index.react_native.min.js)
// The bundles are at the root of dist and the shims are built to dist/import.react_native,
// so that path points to the built shim.
// Marking the imports external via the `external` option is not enough: the bundler would resolve them to
// the file in .build and write a path from the bundle back into .build (../.build/import.react_native/...).
// Returning a relative id from resolveId makes the bundler write it exactly as given.
//
// Shims are built as CommonJS with __esModule set, so a default import of a shim must read its `default`
// export. Rolldown's CJS interop for externals (__toESM) already does that for modules with __esModule set,
// so no per-import interop override is needed (Rollup needed `output.interop: 'esModule'` for these).
const rnImportShimExternalPlugin = {
  name: 'rn-import-shim-external',
  resolveId(source, importer) {
    if (!importer || !source.startsWith('.')) return null;
    const pathInBuild = relative(BUILD_DIR, resolve(dirname(importer), source)).replace(/\.js$/, '');
    if (!pathInBuild.startsWith(`${RN_IMPORT_SHIM_DIR}/`)) return null;
    return { id: `./${pathInBuild}.js`, external: true };
  },
};

// Fails the build unless every built shim contains exactly one require(), of its own package (the shim's
// name). Any other require in a shim could be shifted by the Metro bug when the package is missing. This
// catches imports of other packages, tslib helpers, and code shared between shims (the bundler moves it into
// a shared chunk that the shims require). The shim's own require() is plain code, so it isn't listed in
// chunk.imports; the generated code is parsed instead, with the bundler's parser.
const rnImportShimCheckPlugin = {
  name: 'rn-import-shim-check',
  generateBundle(_, bundle) {
    // Module names of every require(...) call in an ESTree AST; a call whose argument is not a string is
    // listed as '<non-literal>'.
    const findRequireCalls = (node, found = []) => {
      if (Array.isArray(node)) {
        node.forEach(child => findRequireCalls(child, found));
      } else if (node && typeof node.type === 'string') {
        if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'require') {
          const [arg] = node.arguments;
          found.push(arg && arg.type === 'Literal' && typeof arg.value === 'string' ? arg.value : '<non-literal>');
        }
        for (const value of Object.values(node)) {
          if (value && typeof value === 'object') findRequireCalls(value, found);
        }
      }
      return found;
    };

    for (const chunk of Object.values(bundle)) {
      if (chunk.type !== 'chunk') continue;
      const required = findRequireCalls(this.parse(chunk.code));
      if (!chunk.isEntry || required.length !== 1 || required[0] !== chunk.name) {
        this.error(
          `${RN_IMPORT_SHIM_DIR}/${chunk.fileName}: a shim must contain exactly one require(), of its own package` +
          ` '${chunk.name}' (found: ${required.join(', ') || 'none'}). See lib/${RN_IMPORT_SHIM_DIR}/README.md.`
        );
      }
    }
  },
};

const rnImportShimsBundle = {
  input: Object.fromEntries(
    RN_IMPORT_SHIMS.map(name => [name, join(BUILD_DIR, RN_IMPORT_SHIM_DIR, `${name}.js`)])
  ),
  output: {
    exports: 'named',
    format: 'cjs',
    dir: join('dist', RN_IMPORT_SHIM_DIR),
    entryFileNames: '[name].js',
  },
  plugins: [rnImportShimCheckPlugin],
  external: externalDeps,
};

// Rolldown defaults `platform` to 'node' for cjs output, which adds the 'node' export condition and would
// pull Node-only builds of bundled deps (e.g. uuid's dist-node, which requires node:crypto) into
// non-node bundles. Set it explicitly so only the node bundles resolve the 'node' condition.
const rolldownPlatformFor = (platform) => {
  switch (platform) {
    case 'node':
      return 'node';
    case 'browser':
      return 'browser';
    default:
      return 'neutral';
  }
};

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
    plugins: [rnImportShimExternalPlugin],
    platform: rolldownPlatformFor(platform),
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
    plugins: [rnImportShimExternalPlugin],
    platform: rolldownPlatformFor(platform),
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
  'cjs-react-native-import-shims': rnImportShimsBundle,
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
