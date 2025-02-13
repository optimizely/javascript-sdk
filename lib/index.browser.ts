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

import configValidator from './utils/config_validator';
import defaultEventDispatcher from './event_processor/event_dispatcher/default_dispatcher.browser';
import sendBeaconEventDispatcher from './event_processor/event_dispatcher/send_beacon_dispatcher.browser';
import * as enums from './utils/enums';
import { OptimizelyDecideOption, Client, Config } from './shared_types';
import Optimizely from './optimizely';
import { UserAgentParser } from './odp/ua_parser/user_agent_parser';
import { getUserAgentParser } from './odp/ua_parser/ua_parser.browser';
import * as commonExports from './common_exports';
import { PollingConfigManagerConfig } from './project_config/config_manager_factory';
import { createPollingProjectConfigManager } from './project_config/config_manager_factory.browser';
import { createBatchEventProcessor, createForwardingEventProcessor } from './event_processor/event_processor_factory.browser';
import { createVuidManager } from './vuid/vuid_manager_factory.browser';
import { createOdpManager } from './odp/odp_manager_factory.browser';
import { UNABLE_TO_ATTACH_UNLOAD } from 'error_message';
import { extractLogger, createLogger } from './logging/logger_factory';
import { extractErrorNotifier, createErrorNotifier } from './error/error_notifier_factory';
import { LoggerFacade } from './logging/logger';
import { Maybe } from './utils/type';
import { getOptimizelyInstance } from './client_factory';


/**
 * Creates an instance of the Optimizely class
 * @param  {Config} config
 * @return {Client|null} the Optimizely client object
 *                           null on error
 */
const createInstance = function(config: Config): Client | null {
  const client = getOptimizelyInstance(config);

  if (client) {
    const unloadEvent = 'onpagehide' in window ? 'pagehide' : 'unload';
    window.addEventListener(
      unloadEvent,
      () => {
        client.close();
      },
    );
  }

  return client;
};


export {
  defaultEventDispatcher as eventDispatcher,
  // sendBeaconEventDispatcher,
  enums,
  createInstance,
  OptimizelyDecideOption,
  UserAgentParser as IUserAgentParser,
  getUserAgentParser,
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
