/**
 * Copyright 2025, Optimizely
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
import { Client, Config } from './shared_types';
import { getOptimizelyInstance } from './client_factory';
import { JAVASCRIPT_CLIENT_ENGINE } from './utils/enums';

import { RequestHandler } from './utils/http_request_handler/http';

export type UniversalConfig = Config & {
  requestHandler: RequestHandler;
}

/**
 * Creates an instance of the Optimizely class
 * @param  {Config} config
 * @return {Client|null} the Optimizely client object
 *                           null on error
 */
export const createInstance = function(config: UniversalConfig): Client {
  return getOptimizelyInstance(config);
};

export { createEventDispatcher } from './event_processor/event_dispatcher/event_dispatcher_factory';

export { createPollingProjectConfigManager } from './project_config/config_manager_factory.universal';

export { createForwardingEventProcessor, createBatchEventProcessor } from './event_processor/event_processor_factory.universal';

export { createOdpManager } from './odp/odp_manager_factory.universal';

// TODO: decide on vuid manager API for universal
// export { createVuidManager } from './vuid/vuid_manager_factory.node';

export * from './common_exports';

export const clientEngine: string = JAVASCRIPT_CLIENT_ENGINE;

// type exports
export type { RequestHandler } from './utils/http_request_handler/http';

// config manager related types
export type { 
  StaticConfigManagerConfig,
  OpaqueConfigManager,
} from './project_config/config_manager_factory';

export type { UniversalPollingConfigManagerConfig } from './project_config/config_manager_factory.universal';

// event processor related types
export type { 
  LogEvent,
  EventDispatcherResponse,
  EventDispatcher,
} from './event_processor/event_dispatcher/event_dispatcher';

export type { UniversalBatchEventProcessorOptions } from './event_processor/event_processor_factory.universal';

// odp manager related types
export type {
  UniversalOdpManagerOptions,
} from './odp/odp_manager_factory.universal';

export type {
  UserAgentParser,
} from './odp/ua_parser/user_agent_parser';

export type {
  OpaqueEventProcessor,
} from './event_processor/event_processor_factory';

// Logger related types
export type {
  LogHandler,
} from './logging/logger';

export type {
  OpaqueLevelPreset,
  LoggerConfig,
  OpaqueLogger,
} from './logging/logger_factory';

// Error related types
export type { ErrorHandler } from './error/error_handler';
export type { OpaqueErrorNotifier } from './error/error_notifier_factory';

export type { Cache } from './utils/cache/cache';

export type {
  NotificationType,
  NotificationPayload,
} from './notification_center/type';

export type {
  UserAttributeValue,
  UserAttributes,
  OptimizelyConfig,
  FeatureVariableValue,
  OptimizelyVariable,
  OptimizelyVariation,
  OptimizelyExperiment,
  OptimizelyFeature,
  OptimizelyDecisionContext,
  OptimizelyForcedDecision,
  EventTags,
  Event,
  DatafileOptions,
  UserProfileService,
  UserProfile,
  ListenerPayload,
  OptimizelyDecision,
  OptimizelyUserContext,
  Config,
  Client,
  ActivateListenerPayload,
  TrackListenerPayload,
  NotificationCenter,
  OptimizelySegmentOption,
} from './shared_types';
