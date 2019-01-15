import typescript from 'rollup-plugin-typescript';
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: './src/index.rollup.ts',
  output: {
    file: './dist/bundle.js',
    format: 'cjs',
  },
  plugins: [
    resolve(),
    typescript(),
  ]
}
