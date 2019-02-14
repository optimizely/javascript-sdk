var path = require('path');

module.exports = [
  {
    entry: path.resolve(__dirname, 'src/index.browser.js'),
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: [ '.tsx', '.ts', '.js' ]
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'optimizely.browser.umd.js',
      library: 'optimizelySdk',
      libraryTarget: 'umd',
    },
    mode: 'none',
  },
  {
    entry: path.resolve(__dirname, 'src/index.browser.js'),
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: [ '.tsx', '.ts', '.js' ]
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'optimizely.browser.umd.min.js',
      library: 'optimizelySdk',
      libraryTarget: 'umd',
    },
    mode: 'production',
  },
];
