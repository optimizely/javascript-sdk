var path = require('path');

module.exports = [
  {
    entry: path.resolve(__dirname, 'lib/index.browser.js'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'optimizely.browser.umd.js',
    },
    mode: 'none',
  },
  {
    entry: path.resolve(__dirname, 'lib/index.browser.js'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'optimizely.browser.umd.min.js',
    },
    mode: 'production',
  },
];
