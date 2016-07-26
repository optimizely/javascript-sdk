var webpack = require('webpack');

module.exports = {
  module: {
    loaders: [
      { test: /\.json/, loader: 'json-loader' },
    ],
  },
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
  entry: './index.js',
  output: {
    filename: 'optimizely.min.js',
    path: './dist'
  },
};
