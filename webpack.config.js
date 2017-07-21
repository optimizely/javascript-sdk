var webpack = require('webpack');

var plugins = process.env.NODE_ENV === 'production' ?
  [
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
      },
      output: {
        comments: false,
      },
    })
  ] : []
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
        }
      }
    ]
  },
  plugins: plugins,
  output: {
    library: 'optimizelyClient',
    libraryTarget: 'umd'
  },
};
