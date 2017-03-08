var _ = require('optimizely-server-sdk/node_modules/lodash/core');
var configValidator = require('optimizely-server-sdk/lib/utils/config_validator');
var defaultErrorHandler = require('optimizely-server-sdk/lib/plugins/error_handler');
var defaultEventDispatcher = require('./lib/plugins/event_dispatcher');
var enums = require('optimizely-server-sdk/lib/utils/enums');
var logger = require('optimizely-server-sdk/lib/plugins/logger');

var Optimizely = require('optimizely-server-sdk/lib/optimizely');

var JAVASCRIPT_CLIENT_VERSION = '1.2.2';
var MODULE_NAME = 'INDEX';

/**
 * Entry point into the Optimizely Node testing SDK
 */
module.exports = {
  /**
   * Creates an instance of the Optimizely class
   * @param  {Object} config
   * @param  {Object} config.datafile
   * @param  {Object} config.errorHandler
   * @param  {Object} config.eventDispatcher
   * @param  {Object} config.logger
   * @param  {Object} config.logLevel
   * @return {Object} the Optimizely object
   * @throws If any of the config options that were passed in are invalid
   */
  createInstance: function(config) {
    var logLevel = config.logLevel || enums.LOG_LEVEL.INFO;
    var defaultLogger = logger.createLogger({ logLevel: logLevel });
    if (config) {
      try {
        configValidator.validate(config);
        config.isValidInstance = true;
      } catch (ex) {
        var errorMessage = MODULE_NAME + ':' + ex.message;
        if (config.logger) {
          config.logger.log(enums.LOG_LEVEL.ERROR, errorMessage);
        } else {
          defaultLogger.log(enums.LOG_LEVEL.ERROR, errorMessage);
        }
        config.isValidInstance = false;
      }
    }

    config = _.assignIn({
      clientEngine: enums.JAVASCRIPT_CLIENT_ENGINE,
      clientVersion: JAVASCRIPT_CLIENT_VERSION,
      errorHandler: defaultErrorHandler,
      eventDispatcher: defaultEventDispatcher,
      logger: logger.createLogger({ logLevel: logLevel }),
    }, config);

    return new Optimizely(config);
  }
};
