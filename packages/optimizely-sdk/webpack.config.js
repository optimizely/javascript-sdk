var path = require('path');
var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = [
  {
    entry: path.resolve(__dirname, 'lib/index.browser.js'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'optimizely.browser.umd.js',
      library: 'optimizelySdk',
      libraryTarget: 'umd',
    },
    mode: 'none',
  },
  {
    entry: path.resolve(__dirname, 'lib/index.browser.js'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'optimizely.browser.umd.min.js',
      library: 'optimizelySdk',
      libraryTarget: 'umd',
    },
  plugins: [
    new BundleAnalyzerPlugin()
  ],
    mode: 'production',
  },
];
