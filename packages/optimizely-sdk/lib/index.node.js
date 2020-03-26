/****************************************************************************
 * Copyright 2016-2017, 2019, Optimizely, Inc. and contributors             *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/
import * as logging from '@optimizely/js-sdk-logging';

import configValidator from './utils/config_validator';
import defaultErrorHandler from './plugins/error_handler';
import defaultEventDispatcher from './plugins/event_dispatcher/index.node';
import enums from './utils/enums';
import fns from './utils/fns';
import jsonSchemaValidator from './utils/json_schema_validator';
import loggerPlugin from './plugins/logger';
import Optimizely from './optimizely';
import eventProcessorConfigValidator from './utils/event_processor_config_validator';

var logger = logging.getLogger();
logging.setLogLevel(logging.LogLevel.ERROR);

var DEFAULT_EVENT_BATCH_SIZE = 10;
var DEFAULT_EVENT_FLUSH_INTERVAL = 30000; // Unit is ms, default is 30s

/**
 * Entry point into the Optimizely Node testing SDK
 */
export default {
  logging: loggerPlugin,
  errorHandler: defaultErrorHandler,
  eventDispatcher: defaultEventDispatcher,
  enums: enums,

  setLogger: logging.setLogHandler,
  setLogLevel: logging.setLogLevel,

  /**
   * Creates an instance of the Optimizely class
   * @param  {Object} config
   * @param  {Object} config.datafile
   * @param  {Object} config.errorHandler
   * @param  {Object} config.eventDispatcher
   * @param  {Object} config.jsonSchemaValidator
   * @param  {Object} config.logger
   * @param  {Object} config.userProfileService
   * @param {Object} config.eventBatchSize
   * @param {Object} config.eventFlushInterval
   * @return {Object} the Optimizely object
   */
  createInstance: function(config) {
    try {
      var hasLogger = false;
      config = config || {};

      // TODO warn about setting per instance errorHandler / logger / logLevel
      if (config.errorHandler) {
        logging.setErrorHandler(config.errorHandler);
      }
      if (config.logger) {
        // only set a logger in node if one is provided, by not setting we are noop-ing
        hasLogger = true;
        logging.setLogHandler(config.logger);
        // respect the logger's shouldLog functionality
        logging.setLogLevel(logging.LogLevel.NOTSET);
      }
      if (config.logLevel !== undefined) {
        logging.setLogLevel(config.logLevel);
      }

      try {
        configValidator.validate(config);
        config.isValidInstance = true;
      } catch (ex) {
        if (hasLogger) {
          logger.error(ex);
        } else {
          console.error(ex.message);
        }
        config.isValidInstance = false;
      }

      config = fns.assign(
        {
          clientEngine: enums.NODE_CLIENT_ENGINE,
          eventBatchSize: DEFAULT_EVENT_BATCH_SIZE,
          eventDispatcher: defaultEventDispatcher,
          eventFlushInterval: DEFAULT_EVENT_FLUSH_INTERVAL,
          jsonSchemaValidator: jsonSchemaValidator,
          skipJSONValidation: false,
        },
        config,
        {
          // always get the OptimizelyLogger facade from logging
          logger: logger,
          errorHandler: logging.getErrorHandler(),
        }
      );

      if (!eventProcessorConfigValidator.validateEventBatchSize(config.eventBatchSize)) {
        logger.warn('Invalid eventBatchSize %s, defaulting to %s', config.eventBatchSize, DEFAULT_EVENT_BATCH_SIZE);
        config.eventBatchSize = DEFAULT_EVENT_BATCH_SIZE;
      }
      if (!eventProcessorConfigValidator.validateEventFlushInterval(config.eventFlushInterval)) {
        logger.warn(
          'Invalid eventFlushInterval %s, defaulting to %s',
          config.eventFlushInterval,
          DEFAULT_EVENT_FLUSH_INTERVAL
        );
        config.eventFlushInterval = DEFAULT_EVENT_FLUSH_INTERVAL;
      }

      return new Optimizely(config);
    } catch (e) {
      logger.error(e);
      return null;
    }
  },
};
