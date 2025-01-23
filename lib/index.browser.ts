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
import defaultErrorHandler from './plugins/error_handler';
import defaultEventDispatcher from './event_processor/event_dispatcher/default_dispatcher.browser';
import sendBeaconEventDispatcher from './event_processor/event_dispatcher/send_beacon_dispatcher.browser';
import * as enums from './utils/enums';
import { OptimizelyDecideOption, Client, Config, OptimizelyOptions } from './shared_types';
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


const DEFAULT_EVENT_BATCH_SIZE = 10;
const DEFAULT_EVENT_FLUSH_INTERVAL = 1000; // Unit is ms, default is 1s
const DEFAULT_EVENT_MAX_QUEUE_SIZE = 10000;

let hasRetriedEvents = false;

/**
 * Creates an instance of the Optimizely class
 * @param  {Config} config
 * @return {Client|null} the Optimizely client object
 *                           null on error
 */
const createInstance = function(config: Config): Client | null {
  let logger: Maybe<LoggerFacade>;

  try {
    configValidator.validate(config);

    const { clientEngine, clientVersion } = config;
    logger = config.logger ? extractLogger(config.logger) : undefined;
    const errorNotifier = config.errorNotifier ? extractErrorNotifier(config.errorNotifier) : undefined;

    const optimizelyOptions: OptimizelyOptions = {
      ...config,
      clientEngine: clientEngine || enums.JAVASCRIPT_CLIENT_ENGINE,
      clientVersion: clientVersion || enums.CLIENT_VERSION,
      logger,
      errorNotifier,
    };

    const optimizely = new Optimizely(optimizelyOptions);

    try {
      if (typeof window.addEventListener === 'function') {
        const unloadEvent = 'onpagehide' in window ? 'pagehide' : 'unload';
        window.addEventListener(
          unloadEvent,
          () => {
            optimizely.close();
          },
          false
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e) {
      logger?.error(UNABLE_TO_ATTACH_UNLOAD, e.message);
    }

    return optimizely;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e) {
    logger?.error(e);
    return null;
  }
};

const __internalResetRetryState = function(): void {
  hasRetriedEvents = false;
};

export {
  defaultErrorHandler as errorHandler,
  defaultEventDispatcher as eventDispatcher,
  sendBeaconEventDispatcher,
  enums,
  createInstance,
  __internalResetRetryState,
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

export default {
  ...commonExports,
  errorHandler: defaultErrorHandler,
  eventDispatcher: defaultEventDispatcher,
  sendBeaconEventDispatcher,
  enums,
  createInstance,
  __internalResetRetryState,
  OptimizelyDecideOption,
  getUserAgentParser,
  createPollingProjectConfigManager,
  createForwardingEventProcessor,
  createBatchEventProcessor,
  createOdpManager,
  createVuidManager,
};

export * from './export_types';
