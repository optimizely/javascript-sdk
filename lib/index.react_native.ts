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
import Optimizely from './optimizely';
import configValidator from './utils/config_validator';
import defaultEventDispatcher from './event_processor/event_dispatcher/default_dispatcher.browser';
import { createNotificationCenter } from './notification_center';
import { OptimizelyDecideOption, Client, Config } from './shared_types';
import * as commonExports from './common_exports';
import { createPollingProjectConfigManager } from './project_config/config_manager_factory.react_native';
import { createBatchEventProcessor, createForwardingEventProcessor } from './event_processor/event_processor_factory.react_native';
import { createOdpManager } from './odp/odp_manager_factory.react_native';
import { createVuidManager } from './vuid/vuid_manager_factory.react_native';

import 'fast-text-encoding';
import 'react-native-get-random-values';
import { Maybe } from './utils/type';
import { LoggerFacade } from './logging/logger';
import { extractLogger, createLogger } from './logging/logger_factory';
import { extractErrorNotifier, createErrorNotifier } from './error/error_notifier_factory';
import { getOptimizelyInstance } from './client_factory';
import { REACT_NATIVE_JS_CLIENT_ENGINE } from './utils/enums';

/**
 * Creates an instance of the Optimizely class
 * @param  {Config} config
 * @return {Client|null} the Optimizely client object
 *                           null on error
 */
const createInstance = function(config: Config): Client | null {
  const rnConfig = {
    ...config,
    clientEngine: config.clientEngine || REACT_NATIVE_JS_CLIENT_ENGINE,
  }

  return getOptimizelyInstance(rnConfig);
};

/**
 * Entry point into the Optimizely Javascript SDK for React Native
 */
export {
  defaultEventDispatcher as eventDispatcher,
  createInstance,
  OptimizelyDecideOption,
  createPollingProjectConfigManager,
  createForwardingEventProcessor,
  createBatchEventProcessor,
  createOdpManager,
  createVuidManager,
  createLogger,
  createErrorNotifier,
};

export * from './common_exports';

export * from './export_types';
