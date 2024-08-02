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

// import logHelper from './modules/logging/logger';
// import { getLogger, setErrorHandler, getErrorHandler, LogLevel } from './modules/logging';
// import { LocalStoragePendingEventsDispatcher } from './modules/event_processor';
// import configValidator from './utils/config_validator';
// import defaultErrorHandler from './plugins/error_handler';
// import defaultEventDispatcher from './plugins/event_dispatcher/index.browser';
// import sendBeaconEventDispatcher from './plugins/event_dispatcher/send_beacon_dispatcher';
// import * as enums from './utils/enums';
// import * as loggerPlugin from './plugins/logger';
// import eventProcessorConfigValidator from './utils/event_processor_config_validator';
// import { createNotificationCenter } from './core/notification_center';
// import { default as eventProcessor } from './plugins/event_processor';
// import { OptimizelyDecideOption, Client, Config, OptimizelyOptions } from './shared_types';
// import { createHttpPollingDatafileManager } from './plugins/datafile_manager/browser_http_polling_datafile_manager';
// import { BrowserOdpManager } from './plugins/odp_manager/index.browser';
// import Optimizely from './optimizely';
// import { IUserAgentParser } from './core/odp/user_agent_parser';
// import { getUserAgentParser } from './plugins/odp/user_agent_parser/index.browser';
// import * as commonExports from './common_exports';

// const logger = getLogger();
// logHelper.setLogHandler(loggerPlugin.createLogger());
// logHelper.setLogLevel(LogLevel.INFO);

// const MODULE_NAME = 'INDEX_BROWSER';
// const DEFAULT_EVENT_BATCH_SIZE = 10;
// const DEFAULT_EVENT_FLUSH_INTERVAL = 1000; // Unit is ms, default is 1s
// const DEFAULT_EVENT_MAX_QUEUE_SIZE = 10000;

// let hasRetriedEvents = false;

// /**
//  * Creates an instance of the Optimizely class
//  * @param  {Config} config
//  * @return {Client|null} the Optimizely client object
//  *                           null on error
//  */
// const createInstance = function(config: Config): Client | null {
//   try {
//     // TODO warn about setting per instance errorHandler / logger / logLevel
//     let isValidInstance = false;

//     if (config.errorHandler) {
//       setErrorHandler(config.errorHandler);
//     }
//     if (config.logger) {
//       logHelper.setLogHandler(config.logger);
//       // respect the logger's shouldLog functionality
//       logHelper.setLogLevel(LogLevel.NOTSET);
//     }
//     if (config.logLevel !== undefined) {
//       logHelper.setLogLevel(config.logLevel);
//     }

//     try {
//       configValidator.validate(config);
//       isValidInstance = true;
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     } catch (ex) {
//       logger.error(ex);
//     }

//     let eventDispatcher;
//     // prettier-ignore
//     if (config.eventDispatcher == null) { // eslint-disable-line eqeqeq
//       // only wrap the event dispatcher with pending events retry if the user didnt override
//       eventDispatcher = new LocalStoragePendingEventsDispatcher({
//         eventDispatcher: defaultEventDispatcher,
//       });

//       if (!hasRetriedEvents) {
//         eventDispatcher.sendPendingEvents();
//         hasRetriedEvents = true;
//       }
//     } else {
//       eventDispatcher = config.eventDispatcher;
//     }

//     let closingDispatcher = config.closingEventDispatcher;

//     if (!config.eventDispatcher && !closingDispatcher && window.navigator && 'sendBeacon' in window.navigator) {
//       closingDispatcher = sendBeaconEventDispatcher;
//     }

//     let eventBatchSize = config.eventBatchSize;
//     let eventFlushInterval = config.eventFlushInterval;

//     if (!eventProcessorConfigValidator.validateEventBatchSize(config.eventBatchSize)) {
//       logger.warn('Invalid eventBatchSize %s, defaulting to %s', config.eventBatchSize, DEFAULT_EVENT_BATCH_SIZE);
//       eventBatchSize = DEFAULT_EVENT_BATCH_SIZE;
//     }
//     if (!eventProcessorConfigValidator.validateEventFlushInterval(config.eventFlushInterval)) {
//       logger.warn(
//         'Invalid eventFlushInterval %s, defaulting to %s',
//         config.eventFlushInterval,
//         DEFAULT_EVENT_FLUSH_INTERVAL
//       );
//       eventFlushInterval = DEFAULT_EVENT_FLUSH_INTERVAL;
//     }

//     const errorHandler = getErrorHandler();
//     const notificationCenter = createNotificationCenter({ logger: logger, errorHandler: errorHandler });

//     const eventProcessorConfig = {
//       dispatcher: eventDispatcher,
//       closingDispatcher,
//       flushInterval: eventFlushInterval,
//       batchSize: eventBatchSize,
//       maxQueueSize: config.eventMaxQueueSize || DEFAULT_EVENT_MAX_QUEUE_SIZE,
//       notificationCenter,
//     };

//     const odpExplicitlyOff = config.odpOptions?.disabled === true;
//     if (odpExplicitlyOff) {
//       logger.info(enums.LOG_MESSAGES.ODP_DISABLED);
//     }

//     const { clientEngine, clientVersion } = config;

//     const optimizelyOptions: OptimizelyOptions = {
//       clientEngine: enums.JAVASCRIPT_CLIENT_ENGINE,
//       ...config,
//       eventProcessor: eventProcessor.createEventProcessor(eventProcessorConfig),
//       logger,
//       errorHandler,
//       datafileManager: config.sdkKey
//         ? createHttpPollingDatafileManager(config.sdkKey, logger, config.datafile, config.datafileOptions)
//         : undefined,
//       notificationCenter,
//       isValidInstance,
//       odpManager: odpExplicitlyOff ? undefined
//         : BrowserOdpManager.createInstance({ logger, odpOptions: config.odpOptions, clientEngine, clientVersion }),
//     };

//     const optimizely = new Optimizely(optimizelyOptions);

//     try {
//       if (typeof window.addEventListener === 'function') {
//         const unloadEvent = 'onpagehide' in window ? 'pagehide' : 'unload';
//         window.addEventListener(
//           unloadEvent,
//           () => {
//             optimizely.close();
//           },
//           false
//         );
//       }
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     } catch (e) {
//       logger.error(enums.LOG_MESSAGES.UNABLE_TO_ATTACH_UNLOAD, MODULE_NAME, e.message);
//     }

//     return optimizely;
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (e) {
//     logger.error(e);
//     return null;
//   }
// };

// const __internalResetRetryState = function(): void {
//   hasRetriedEvents = false;
// };

// /**
//  * Entry point into the Optimizely Browser SDK
//  */

// const setLogHandler = logHelper.setLogHandler;
// const setLogLevel = logHelper.setLogLevel;

// export {
//   loggerPlugin as logging,
//   defaultErrorHandler as errorHandler,
//   defaultEventDispatcher as eventDispatcher,
//   sendBeaconEventDispatcher,
//   enums,
//   setLogHandler as setLogger,
//   setLogLevel,
//   createInstance,
//   __internalResetRetryState,
//   OptimizelyDecideOption,
//   IUserAgentParser,
//   getUserAgentParser,
// };

// export * from './common_exports';

// export default {
//   ...commonExports,
//   logging: loggerPlugin,
//   errorHandler: defaultErrorHandler,
//   eventDispatcher: defaultEventDispatcher,
//   sendBeaconEventDispatcher,
//   enums,
//   setLogger: setLogHandler,
//   setLogLevel,
//   createInstance,
//   __internalResetRetryState,
//   OptimizelyDecideOption,
//   getUserAgentParser,
// };

// export * from './export_types';

// import * as errMsg from "errorMessage";

// const y: string = 'FOO';
// export const x = (errMsg as any)[y];

// export const y = FOO;

import { ABCD, MESS, Fooer, Extra } from "./extra";

export const doFoo = (conf: { use: boolean}) => {
  console.log('inside foo');
  const u = conf.use;

  const e = u ? new Extra(u) : undefined;
  e?.foo();

  console.log(MESS.ABCD);
}

export const doBar = (conf: { extra?: Extra}) => {
  console.log('inside bar');
  const pp = conf.extra;
  if(pp) pp.foo();
  console.log(ABCD);
}

export { Fooer, Extra } from "./extra";
