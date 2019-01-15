import typescript from 'rollup-plugin-typescript2'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import { uglify } from 'rollup-plugin-uglify'
import pkg from './package.json'

const plugins = [
  resolve(),
  typescript(),
  commonjs({
    include: /node_modules/,
  }),
]

// const plugins = [typescript()]
const external = [
  // ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
]
console.log(
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/react-sdk.browser.umd.js',
        format: 'umd',
        name: 'optimizelyReactSdk',
        globals: {
          react: 'React',
        },
      },
    ],
    external,
    plugins,
  },
)

export default [
  {
    input: 'src/index.cjs.ts',
    output: [
      {
        file: 'dist/react-sdk.js',
        format: 'cjs',
      },
      {
        file: 'dist/react-sdk.mjs',
        format: 'es',
      },
    ],
    external,
    plugins,
  },

  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/react-sdk.browser.umd.js',
        format: 'umd',
        name: 'optimizelyReactSdk',
        globals: {
          react: 'React',
        },
      },
    ],
    external,
    plugins,
  },

  {
    input: 'src/index.ts',
    output: {
      file: 'dist/react-sdk.browser.umd.min.js',
      format: 'umd',
      name: 'optimizelyReactSdk',
      globals: {
        react: 'React',
      },
    },
    external,
    plugins: [...plugins, uglify()],
  },
]
