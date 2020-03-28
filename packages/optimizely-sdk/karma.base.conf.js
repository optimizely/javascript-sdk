/**
 * Copyright 2018, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Karma base configuration
module.exports = {
  // base path that will be used to resolve all patterns (eg. files, exclude)
  basePath: '',

  //plugins
  plugins: ['karma-mocha', require('karma-browserstack-launcher'), require('@open-wc/karma-esm')],

  //browserStack setup
  browserStack: {
    username: process.env.BROWSER_STACK_USERNAME,
    accessKey: process.env.BROWSER_STACK_ACCESS_KEY,
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
      os_version: 'Mountain Lion',
    },
    bs_edge: {
      base: 'BrowserStack',
      os: 'Windows',
      os_version: '10',
      browser: 'edge',
      device: null,
      browser_version: '15.0',
    },
    bs_firefox_mac: {
      base: 'BrowserStack',
      browser: 'firefox',
      browser_version: '21.0',
      os: 'OS X',
      os_version: 'Mountain Lion',
    },
    bs_ie: {
      base: 'BrowserStack',
      os: 'Windows',
      os_version: '7',
      browser: 'ie',
      device: null,
      browser_version: '10.0',
    },
    bs_opera_mac: {
      base: 'BrowserStack',
      browser: 'opera',
      browser_version: '37',
      os: 'OS X',
      os_version: 'Mountain Lion',
    },
    bs_safari: {
      base: 'BrowserStack',
      os: 'OS X',
      os_version: 'Mountain Lion',
      browser: 'safari',
      device: null,
      browser_version: '6.2',
    },
  },
  esm: {
    // if you are using 'bare module imports' you will need this option
    nodeResolve: true,
  },

  browsers: ['bs_chrome_mac', 'bs_edge', 'bs_firefox_mac', 'bs_ie', 'bs_opera_mac', 'bs_safari'],

  // frameworks to use
  // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
  frameworks: ['esm'],

  // list of files to exclude
  exclude: [],

  // test results reporter to use
  // possible values: 'dots', 'progress'
  // available reporters: https://npmjs.org/browse/keyword/karma-reporter
  reporters: ['progress'],

  // web server port
  port: 9876,

  // enable / disable colors in the output (reporters and logs)
  colors: true,

  // enable / disable watching file and executing tests whenever any file changes
  autoWatch: false,

  // Continuous Integration mode
  // if true, Karma captures browsers, runs the tests and exits
  singleRun: true,

  // Concurrency level
  // how many browser should be started simultaneous
  concurrency: Infinity,
};
