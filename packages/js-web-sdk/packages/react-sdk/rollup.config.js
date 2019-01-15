import typescript from 'rollup-plugin-typescript'
import resolve from 'rollup-plugin-node-resolve'
import { uglify } from 'rollup-plugin-uglify'

const plugins = [resolve(), typescript()]

export default [
  {
    input: 'src/index.cjs.ts',
    output: {
      file: 'dist/react-sdk.js',
      format: 'cjs',
    },
    plugins,
  },

  {
    input: 'src/index.ts',
    output: {
      file: 'dist/react-sdk.mjs',
      format: 'es',
    },
    plugins,
  },

  {
    input: 'src/index.cjs.ts',
    output: {
      file: 'dist/react-sdk.browser.umd.js',
      format: 'umd',
      global: 'optimizelyReactSdk',
    },
    plugins,
  },

  {
    input: 'src/index.cjs.ts',
    output: {
      file: 'dist/react-sdk.browser.umd.min.js',
      format: 'umd',
      global: 'optimizelyReactSdk',
    },
    plugins: [...plugins, uglify()],
  },
]
