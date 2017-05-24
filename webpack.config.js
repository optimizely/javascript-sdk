var webpack = require('webpack');
var path = require('path');

module.exports = {
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
      },
      output: {
        comments: false,
      },
    }),
    new webpack.optimize.DedupePlugin(),
  ],
  output: {
    library: 'optimizelyClient',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.json$/,
        use: 'json-loader'
      }
    ]
  }
};
