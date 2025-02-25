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

import { expectTypeOf } from 'vitest';

import * as universal from './index.universal';

type WithoutReadonly<T> = { -readonly [P in keyof T]: T[P] };

const universalEntrypoint: WithoutReadonly<typeof universal> = universal;

import {
  Config,
  Client,
  StaticConfigManagerConfig,
  OpaqueConfigManager,
  EventDispatcher,
  OpaqueEventProcessor,
  OpaqueLevelPreset,
  LoggerConfig,
  OpaqueLogger,
  ErrorHandler,
  OpaqueErrorNotifier,
} from './export_types';

import { UniversalPollingConfigManagerConfig } from './project_config/config_manager_factory.universal';
import { RequestHandler } from './utils/http_request_handler/http';
import { UniversalBatchEventProcessorOptions } from './event_processor/event_processor_factory.universal';
import {
  DECISION_SOURCES,
  DECISION_NOTIFICATION_TYPES,
  NOTIFICATION_TYPES,
} from './utils/enums';

import { LogLevel } from './logging/logger';

import { OptimizelyDecideOption } from './shared_types';

export type UniversalEntrypoint = {
  // client factory
  createInstance: (config: Config) => Client | null;

  // config manager related exports
  createStaticProjectConfigManager: (config: StaticConfigManagerConfig) => OpaqueConfigManager;
  createPollingProjectConfigManager: (config: UniversalPollingConfigManagerConfig) => OpaqueConfigManager;

  // event processor related exports
  createEventDispatcher: (requestHandler: RequestHandler) => EventDispatcher;
  createForwardingEventProcessor: (eventDispatcher: EventDispatcher) => OpaqueEventProcessor;
  createBatchEventProcessor: (options: UniversalBatchEventProcessorOptions) => OpaqueEventProcessor;

  // TODO: odp manager related exports
  // createOdpManager: (options: OdpManagerOptions) => OpaqueOdpManager;

  // TODO: vuid manager related exports
  // createVuidManager: (options: VuidManagerOptions) => OpaqueVuidManager;

  // logger related exports
  LogLevel: typeof LogLevel;
  DebugLog: OpaqueLevelPreset,
  InfoLog: OpaqueLevelPreset,
  WarnLog: OpaqueLevelPreset,
  ErrorLog: OpaqueLevelPreset,
  createLogger: (config: LoggerConfig) => OpaqueLogger;

  // error related exports
  createErrorNotifier: (errorHandler: ErrorHandler) => OpaqueErrorNotifier;

  // enums
  DECISION_SOURCES: typeof DECISION_SOURCES;
  DECISION_NOTIFICATION_TYPES: typeof DECISION_NOTIFICATION_TYPES;
  NOTIFICATION_TYPES: typeof NOTIFICATION_TYPES;

  // decide options
  OptimizelyDecideOption: typeof OptimizelyDecideOption;

  // client engine
  clientEngine: string;
}


expectTypeOf(universalEntrypoint).toEqualTypeOf<UniversalEntrypoint>();
