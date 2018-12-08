var path = require('path')

const tsConfig = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};

module.exports = [
  {
    entry: path.resolve(__dirname, 'src/index.ts'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'optimizely.browser.umd.js',
      library: 'optimizelySdk',
      libraryTarget: 'umd',
    },
    mode: 'none',
    ...tsConfig,
  },
  {
    entry: path.resolve(__dirname, 'src/index.ts'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'optimizely.browser.umd.min.js',
      library: 'optimizelySdk',
      libraryTarget: 'umd',
    },
    mode: 'production',
    ...tsConfig,
  },
]
