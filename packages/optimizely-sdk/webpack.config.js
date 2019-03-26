var path = require('path');

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
    node: {
      // set to not polyfill setImmediate in promise polyfill
      // it is already wrapped in a typeof check
      setImmediate: false
    },
  },
  {
    entry: path.resolve(__dirname, 'lib/index.browser.js'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'optimizely.browser.umd.min.js',
      library: 'optimizelySdk',
      libraryTarget: 'umd',
    },
    mode: 'production',
    node: {
      // set to not polyfill setImmediate in promise polyfill
      // it is already wrapped in a typeof check
      setImmediate: false
    },
  },
];
