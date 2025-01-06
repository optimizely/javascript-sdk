/**
 * Copyright 2016-2017, 2019-2024 Optimizely
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

// import { getLogger, setErrorHandler, getErrorHandler, LogLevel, setLogHandler, setLogLevel } from './modules/logging';
import Optimizely from './optimizely';
import * as enums from './utils/enums';
import configValidator from './utils/config_validator';
import defaultErrorHandler from './plugins/error_handler';
import defaultEventDispatcher from './event_processor/event_dispatcher/default_dispatcher.node';
import { createNotificationCenter } from './notification_center';
import { OptimizelyDecideOption, Client, Config } from './shared_types';
import * as commonExports from './common_exports';
import { createPollingProjectConfigManager } from './project_config/config_manager_factory.node';
import { createForwardingEventProcessor, createBatchEventProcessor } from './event_processor/event_processor_factory.node';
import { createVuidManager } from './vuid/vuid_manager_factory.node';
import { createOdpManager } from './odp/odp_manager_factory.node';
import { ODP_DISABLED } from './log_messages';

const DEFAULT_EVENT_BATCH_SIZE = 10;
const DEFAULT_EVENT_FLUSH_INTERVAL = 30000; // Unit is ms, default is 30s
const DEFAULT_EVENT_MAX_QUEUE_SIZE = 10000;

/**
 * Creates an instance of the Optimizely class
 * @param  {Config} config
 * @return {Client|null} the Optimizely client object
 *                           null on error
 */
const createInstance = function(config: Config): Client | null {
  try {
    configValidator.validate(config);

    const { clientEngine, clientVersion } = config;

    const optimizelyOptions = {
      ...config,
      clientEngine: clientEngine || enums.NODE_CLIENT_ENGINE,
      clientVersion: clientVersion || enums.CLIENT_VERSION,
    };

    return new Optimizely(optimizelyOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e) {
    config.logger?.error(e);
    return null;
  }
};

/**
 * Entry point into the Optimizely Node testing SDK
 */
export {
  defaultErrorHandler as errorHandler,
  defaultEventDispatcher as eventDispatcher,
  enums,
  createInstance,
  OptimizelyDecideOption,
  createPollingProjectConfigManager,
  createForwardingEventProcessor,
  createBatchEventProcessor,
  createOdpManager,
  createVuidManager,
};

export * from './common_exports';

export default {
  ...commonExports,
  errorHandler: defaultErrorHandler,
  eventDispatcher: defaultEventDispatcher,
  enums,
  createInstance,
  OptimizelyDecideOption,
  createPollingProjectConfigManager,
  createForwardingEventProcessor,
  createBatchEventProcessor,
  createOdpManager,
  createVuidManager,
};

export * from './export_types';
