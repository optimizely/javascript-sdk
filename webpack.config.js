var webpack = require('webpack');

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
};
