var _ = require('lodash/core');
var configValidator = require('optimizely-server-sdk/lib/utils/config_validator');
var defaultErrorHandler = require('optimizely-server-sdk/lib/plugins/error_handler');
var defaultEventDispatcher = require('./lib/plugins/event_dispatcher');
var enums = require('optimizely-server-sdk/lib/utils/enums');
var logger = require('optimizely-server-sdk/lib/plugins/logger');

var Optimizely = require('optimizely-server-sdk/lib/optimizely');

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
   * @return {Object} the Optimizely object
   * @throws If any of the config options that were passed in are invalid
   */
  createInstance: function(config) {
    var defaultLogger = logger.createLogger({ logLevel: enums.LOG_LEVEL.INFO });
    if (config) {
      try {
        configValidator.validate(config);
      } catch (ex) {
        defaultLogger.log(enums.LOG_LEVEL.ERROR, ex.message);
      }
    }

    config = _.assignIn({
      errorHandler: defaultErrorHandler,
      eventDispatcher: defaultEventDispatcher,
      logger: logger.createLogger({ logLevel: enums.LOG_LEVEL.INFO }),
    }, config);

    return new Optimizely(config);
  }
};
