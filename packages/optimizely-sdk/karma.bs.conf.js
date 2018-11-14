// Karma configuration
// Generated on Wed May 24 2017 14:10:20 GMT-0700 (PDT)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    //plugins
    plugins: ['karma-mocha', 'karma-webpack', require('karma-browserstack-launcher')],

    webpack: {
      mode: 'production',
    },

    //browserStack setup
    browserStack: {
      username: process.env.BROWSER_STACK_USERNAME,
      accessKey: process.env.BROWSER_STACK_ACCESS_KEY
    },

    // to avoid DISCONNECTED messages when connecting to BrowserStack
    browserDisconnectTimeout: 10000, // default 2000
    browserDisconnectTolerance: 1, // default 0
    browserNoActivityTimeout: 4 * 60 * 1000, //default 10000
    captureTimeout: 4 * 60 * 1000, //default 60000

    // define browsers
    customLaunchers: {
      bs_chrome_mac: {
        base: 'BrowserStack',
        browser: 'chrome',
        browser_version: '21.0',
        os: 'OS X',
        os_version: 'Mountain Lion'
      },
      bs_edge: {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '10',
        browser: 'edge',
        device: null,
        browser_version: '15.0'
      },
      bs_firefox_mac: {
        base: 'BrowserStack',
        browser: 'firefox',
        browser_version: '21.0',
        os: 'OS X',
        os_version: 'Mountain Lion'
      },
      bs_ie: {
        base: 'BrowserStack',
        os: 'Windows',
        os_version: '7',
        browser: 'ie',
        device: null,
        browser_version: '10.0'
      },
      bs_iphone6: {
        base: 'BrowserStack',
        device: 'iPhone 6',
        os: 'ios',
        os_version: '8.3'
      },
      bs_opera_mac: {
        base: 'BrowserStack',
        browser: 'opera',
        browser_version: '37',
        os: 'OS X',
        os_version: 'Mountain Lion'
      },
      bs_safari: {
        base: 'BrowserStack',
        os: 'OS X',
        os_version: 'Mountain Lion',
        browser: 'safari',
        device: null,
        browser_version: '6.2'
      }
    },

    browsers: ['bs_chrome_mac', 'bs_edge', 'bs_firefox_mac', 'bs_ie', 'bs_iphone6', 'bs_opera_mac', 'bs_safari'],

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha'],


    // list of files / patterns to load in the browser
    files: [
      './lib/index.browser.tests.js'
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      './lib/**/*tests.js': ['webpack']
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  });
};
