/**
 * Copyright 2019-2024, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getLogger, setErrorHandler, getErrorHandler, LogLevel, setLogHandler, setLogLevel } from './modules/logging';
import * as enums from './utils/enums';
import Optimizely from './optimizely';
import configValidator from './utils/config_validator';
import defaultErrorHandler from './plugins/error_handler';
import * as loggerPlugin from './plugins/logger/index.react_native';
import defaultEventDispatcher from './plugins/event_dispatcher/index.browser';
import eventProcessorConfigValidator from './utils/event_processor_config_validator';
import { createNotificationCenter } from './core/notification_center';
import { createEventProcessor } from './plugins/event_processor/index.react_native';
import { OptimizelyDecideOption, Client, Config, VuidManagerOptions } from './shared_types';
import { createHttpPollingDatafileManager } from './plugins/datafile_manager/react_native_http_polling_datafile_manager';
import { BrowserOdpManager } from './plugins/odp_manager/index.browser';
import * as commonExports from './common_exports';
import BrowserAsyncStorageCache from './plugins/key_value_cache/browserAsyncStorageCache';
import { VuidManager } from './plugins/vuid_manager';
import 'fast-text-encoding';
import 'react-native-get-random-values';

const logger = getLogger();
setLogHandler(loggerPlugin.createLogger());
setLogLevel(LogLevel.INFO);

const DEFAULT_EVENT_BATCH_SIZE = 10;
const DEFAULT_EVENT_FLUSH_INTERVAL = 1000; // Unit is ms, default is 1s
const DEFAULT_EVENT_MAX_QUEUE_SIZE = 10000;

/**
 * Creates an instance of the Optimizely class
 * @param  {Config} config
 * @return {Client|null} the Optimizely client object
 *                           null on error
 */
const createInstance = async function(config: Config): Promise<Client | null> {
  try {
    // TODO warn about setting per instance errorHandler / logger / logLevel
    let isValidInstance = false;

    if (config.errorHandler) {
      setErrorHandler(config.errorHandler);
    }
    if (config.logger) {
      setLogHandler(config.logger);
      // respect the logger's shouldLog functionality
      setLogLevel(LogLevel.NOTSET);
    }
    if (config.logLevel !== undefined) {
      setLogLevel(config.logLevel);
    }

    try {
      configValidator.validate(config);
      isValidInstance = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (ex) {
      logger.error(ex);
    }

    let eventBatchSize = config.eventBatchSize;
    let eventFlushInterval = config.eventFlushInterval;

    if (!eventProcessorConfigValidator.validateEventBatchSize(config.eventBatchSize)) {
      logger.warn('Invalid eventBatchSize %s, defaulting to %s', config.eventBatchSize, DEFAULT_EVENT_BATCH_SIZE);
      eventBatchSize = DEFAULT_EVENT_BATCH_SIZE;
    }
    if (!eventProcessorConfigValidator.validateEventFlushInterval(config.eventFlushInterval)) {
      logger.warn(
        'Invalid eventFlushInterval %s, defaulting to %s',
        config.eventFlushInterval,
        DEFAULT_EVENT_FLUSH_INTERVAL
      );
      eventFlushInterval = DEFAULT_EVENT_FLUSH_INTERVAL;
    }

    const errorHandler = getErrorHandler();
    const notificationCenter = createNotificationCenter({ logger: logger, errorHandler: errorHandler });

    const eventProcessorConfig = {
      dispatcher: config.eventDispatcher || defaultEventDispatcher,
      flushInterval: eventFlushInterval,
      batchSize: eventBatchSize,
      maxQueueSize: config.eventMaxQueueSize || DEFAULT_EVENT_MAX_QUEUE_SIZE,
      notificationCenter,
      peristentCacheProvider: config.persistentCacheProvider,
    };

    const eventProcessor = createEventProcessor(eventProcessorConfig);

    const odpExplicitlyOff = config.odpOptions?.disabled === true;
    if (odpExplicitlyOff) {
      logger.info(enums.LOG_MESSAGES.ODP_DISABLED);
    }

    const { clientEngine, clientVersion } = config;
    
    const cache = new BrowserAsyncStorageCache();
    const vuidManagerOptions: VuidManagerOptions = {
      enableVuid: config.vuidManagerOptions?.enableVuid || false,
    }

    const optimizelyOptions = {
      clientEngine: enums.REACT_NATIVE_JS_CLIENT_ENGINE,
      ...config,
      eventProcessor,
      logger,
      errorHandler,
      datafileManager: config.sdkKey
        ? createHttpPollingDatafileManager(
          config.sdkKey,
          logger,
          config.datafile,
          config.datafileOptions,
          config.persistentCacheProvider,
        )
        : undefined,
      notificationCenter,
      isValidInstance: isValidInstance,
      odpManager: odpExplicitlyOff ? undefined
        :BrowserOdpManager.createInstance({ logger, odpOptions: config.odpOptions, clientEngine, clientVersion }),
      vuidManager: await VuidManager.instance(cache, vuidManagerOptions),
    };

    // If client engine is react, convert it to react native.
    if (optimizelyOptions.clientEngine === enums.REACT_CLIENT_ENGINE) {
      optimizelyOptions.clientEngine = enums.REACT_NATIVE_CLIENT_ENGINE;
    }

    return new Optimizely(optimizelyOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e) {
    logger.error(e);
    return null;
  }
};

/**
 * Entry point into the Optimizely Javascript SDK for React Native
 */
export {
  loggerPlugin as logging,
  defaultErrorHandler as errorHandler,
  defaultEventDispatcher as eventDispatcher,
  enums,
  setLogHandler as setLogger,
  setLogLevel,
  createInstance,
  OptimizelyDecideOption,
};

export * from './common_exports';

export default {
  ...commonExports,
  logging: loggerPlugin,
  errorHandler: defaultErrorHandler,
  eventDispatcher: defaultEventDispatcher,
  enums,
  setLogger: setLogHandler,
  setLogLevel,
  createInstance,
  OptimizelyDecideOption,
};

export * from './export_types';
