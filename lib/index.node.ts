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

import * as enums from './utils/enums';
import defaultEventDispatcher from './event_processor/event_dispatcher/default_dispatcher.node';
import { createNotificationCenter } from './notification_center';
import { OptimizelyDecideOption, Client, Config } from './shared_types';
import * as commonExports from './common_exports';
import { createPollingProjectConfigManager } from './project_config/config_manager_factory.node';
import { createForwardingEventProcessor, createBatchEventProcessor } from './event_processor/event_processor_factory.node';
import { createVuidManager } from './vuid/vuid_manager_factory.node';
import { createOdpManager } from './odp/odp_manager_factory.node';
import { extractLogger, createLogger } from './logging/logger_factory';
import { extractErrorNotifier, createErrorNotifier } from './error/error_notifier_factory';
import { Maybe } from './utils/type';
import { LoggerFacade } from './logging/logger';
import { ErrorNotifier } from './error/error_notifier';
import { getOptimizelyInstance } from './client_factory';

/**
 * Creates an instance of the Optimizely class
 * @param  {Config} config
 * @return {Client|null} the Optimizely client object
 *                           null on error
 */
const createInstance = function(config: Config): Client | null {
  const nodeConfig = {
    ...config,
    clientEnging: config.clientEngine || enums.NODE_CLIENT_ENGINE,
  }

  return getOptimizelyInstance(nodeConfig);
};

/**
 * Entry point into the Optimizely Node testing SDK
 */
export {
  defaultEventDispatcher as eventDispatcher,
  enums,
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
