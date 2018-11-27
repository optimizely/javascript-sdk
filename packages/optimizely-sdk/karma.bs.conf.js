// Karma configuration
// Generated on Tue Nov 27 2018 10:51:00 GMT-0700 (PDT)
const baseConfig = require('./karma.base.conf.js')

module.exports = function(config) {
  config.set({
    ...baseConfig,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // list of files / patterns to load in the browser
    files: [
      './lib/index.browser.tests.js'
    ],
  });
};
