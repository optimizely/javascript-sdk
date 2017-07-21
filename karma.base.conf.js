module.exports = {
  // base path that will be used to resolve all patterns (eg. files, exclude)
  basePath: '',


  // frameworks to use
  // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
  frameworks: ['mocha'],


  // list of files / patterns to load in the browser
  files: [
    './tests/test_index.js',
  ],


  // list of files to exclude
  exclude: [
  ],


  // test results reporter to use
  // possible values: 'dots', 'progress'
  // available reporters: https://npmjs.org/browse/keyword/karma-reporter
  reporters: ['progress'],


  // web server port
  port: 9876,


  // enable / disable colors in the output (reporters and logs)
  colors: true,


  // start these browsers
  // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
  browsers: ['Chrome'],


  // Continuous Integration mode
  // if true, Karma captures browsers, runs the tests and exits
  singleRun: true,

  // Concurrency level
  // how many browser should be started simultaneous
  concurrency: Infinity,


  preprocessors: {
    // add webpack as preprocessor
    './tests/test_index.js': ['webpack', 'babel'],
  },


  babelPreprocessor: {
    options: {
      compact: false
    }
  },

  webpack: {},

  plugins: [
      'karma-webpack',
      'karma-mocha',
      'karma-chrome-launcher',
      'karma-babel-preprocessor',
  ],
}
