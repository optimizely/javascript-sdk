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

import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import alias from '@rollup/plugin-alias';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);
const { dependencies, peerDependencies } = require('./package.json');

const resolvePlugin = nodeResolve();

const resolvePluginNode = nodeResolve({
  exportConditions: ['node'],
});

const resolvePluginBrowser = nodeResolve({
  browser: true,
  exportConditions: ['browser'],
});

const resolvePluginByPlatform = {
  node: resolvePluginNode,
  browser: resolvePluginBrowser,
};

const aliasPlugin = alias({
  entries: [
    { find: 'error_message', replacement: join(__dirname, '.build/message/error_message.gen.js') },
    { find: 'log_message', replacement: join(__dirname, '.build/message/log_message.gen.js') },
  ]
});

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
// Marking the imports external via the `external` option is not enough: Rollup would resolve them to the
// file in .build and write a path from the bundle back into .build (../.build/import.react_native/...).
// Returning a relative id from resolveId makes Rollup write it exactly as given.
const rnImportShimExternalPlugin = {
  name: 'rn-import-shim-external',
  resolveId(source, importer) {
    if (!importer || !source.startsWith('.')) return null;
    const pathInBuild = relative(BUILD_DIR, resolve(dirname(importer), source)).replace(/\.js$/, '');
    if (!pathInBuild.startsWith(`${RN_IMPORT_SHIM_DIR}/`)) return null;
    return { id: `./${pathInBuild}.js`, external: true };
  },
};

// Shims are built as CommonJS with __esModule set, so a default import of a shim must read its `default`
// export ('esModule'). Rollup's 'default' interop, used for the other externals, would read the whole module.
const rnImportShimInterop = id => (id && id.startsWith(`./${RN_IMPORT_SHIM_DIR}/`) ? 'esModule' : 'default');

// Fails the build unless every built shim contains exactly one require(), of its own package (the shim's
// name). Any other require in a shim could be shifted by the Metro bug when the package is missing. This
// catches imports of other packages, tslib helpers, and code shared between shims (Rollup moves it into a
// shared chunk that the shims require). The shim's own require() is plain code, so Rollup doesn't list it in
// chunk.imports; the generated code is checked instead.
const rnImportShimCheckPlugin = {
  name: 'rn-import-shim-check',
  generateBundle(_, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type !== 'chunk') continue;
      const requireCalls = chunk.code.match(/\brequire\s*\(/g) || [];
      const requiredIds = [...chunk.code.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);
      const ok = chunk.isEntry && requireCalls.length === 1 && requiredIds.length === 1 && requiredIds[0] === chunk.name;
      if (!ok) {
        this.error(
          `${RN_IMPORT_SHIM_DIR}/${chunk.fileName}: a shim must contain exactly one require(), of its own package` +
          ` '${chunk.name}' (found: ${requiredIds.join(', ') || 'none'}). See lib/${RN_IMPORT_SHIM_DIR}/README.md.`
        );
      }
    }
  },
};

const rnImportShimsBundle = {
  plugins: [rnImportShimCheckPlugin],
  external: externalDeps,
  input: Object.fromEntries(
    RN_IMPORT_SHIMS.map(name => [name, join(BUILD_DIR, RN_IMPORT_SHIM_DIR, `${name}.js`)])
  ),
  output: {
    exports: 'named',
    format: 'cjs',
    dir: join('dist', RN_IMPORT_SHIM_DIR),
    entryFileNames: '[name].js',
  },
};

const cjsBundleFor = (platform, opt = {}) => {
  const { minify, ext } = {
    minify: true,
    ext: '.js',
    ...opt,
  };

  const min = minify ? '.min' : '';

  return {
    plugins: [rnImportShimExternalPlugin, aliasPlugin, resolvePluginByPlatform[platform] || resolvePlugin, commonjs()],
    external: externalDepsWithoutUuid,
    input: `.build/index.${platform}.js`,
    output: {
      exports: 'named',
      format: 'cjs',
      file: `dist/index.${platform}${min}${ext}`,
      interop: rnImportShimInterop,
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
    external: externalDeps,
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
    plugins: [aliasPlugin, resolvePlugin, commonjs()],
    external: externalDepsWithoutUuid,
    input: `.build/odp/ua_parser/ua_parser.js`,
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
    external: externalDeps,
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
    aliasPlugin,
    resolvePluginBrowser,
    commonjs(),
  ],
  input: '.build/index.browser.js',
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
  plugins: [aliasPlugin, resolvePlugin, commonjs()],
  external: ['json-schema'],
  input: '.build/utils/json_schema_validator/index.js',
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
  'cjs-react-native-import-shims': rnImportShimsBundle,
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
