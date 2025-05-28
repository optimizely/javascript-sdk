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

import * as browser from './index.browser';
import * as node from './index.node';
import * as reactNative from './index.react_native';

type WithoutReadonly<T> = { -readonly [P in keyof T]: T[P] };

const nodeEntrypoint: WithoutReadonly<typeof node> = node;
const browserEntrypoint: WithoutReadonly<typeof browser> = browser;
const reactNativeEntrypoint: WithoutReadonly<typeof reactNative> = reactNative;

import {
  Config,
  Client,
  StaticConfigManagerConfig,
  OpaqueConfigManager,
  PollingConfigManagerConfig,
  EventDispatcher,
  OpaqueEventProcessor,
  BatchEventProcessorOptions,
  OdpManagerOptions,
  OpaqueOdpManager,
  VuidManagerOptions,
  OpaqueVuidManager,
  OpaqueLevelPreset,
  LoggerConfig,
  OpaqueLogger,
  ErrorHandler,
  OpaqueErrorNotifier,
} from './export_types';

import {
  DECISION_SOURCES,
} from './utils/enums';

import { NOTIFICATION_TYPES, DECISION_NOTIFICATION_TYPES } from './notification_center/type';

import { LogLevel } from './logging/logger';

import { OptimizelyDecideOption } from './shared_types';
import { Maybe } from './utils/type';

export type Entrypoint = {
  // client factory
  createInstance: (config: Config) => Client;

  // config manager related exports
  createStaticProjectConfigManager: (config: StaticConfigManagerConfig) => OpaqueConfigManager;
  createPollingProjectConfigManager: (config: PollingConfigManagerConfig) => OpaqueConfigManager;

  // event processor related exports
  eventDispatcher: EventDispatcher;
  getSendBeaconEventDispatcher: () => Maybe<EventDispatcher>;
  createForwardingEventProcessor: (eventDispatcher?: EventDispatcher) => OpaqueEventProcessor;
  createBatchEventProcessor: (options?: BatchEventProcessorOptions) => OpaqueEventProcessor;

  // odp manager related exports
  createOdpManager: (options?: OdpManagerOptions) => OpaqueOdpManager;

  // vuid manager related exports
  createVuidManager: (options?: VuidManagerOptions) => OpaqueVuidManager;

  // logger related exports
  LogLevel: typeof LogLevel;
  DEBUG: OpaqueLevelPreset,
  INFO: OpaqueLevelPreset,
  WARN: OpaqueLevelPreset,
  ERROR: OpaqueLevelPreset,
  createLogger: (config: LoggerConfig) => OpaqueLogger;

  // error related exports
  createErrorNotifier: (errorHandler: ErrorHandler) => OpaqueErrorNotifier;

  // enums
  DECISION_SOURCES: typeof DECISION_SOURCES;
  NOTIFICATION_TYPES: typeof NOTIFICATION_TYPES;
  DECISION_NOTIFICATION_TYPES: typeof DECISION_NOTIFICATION_TYPES;

  // decide options
  OptimizelyDecideOption: typeof OptimizelyDecideOption;

  // client engine
  clientEngine: string;
}


expectTypeOf(browserEntrypoint).toEqualTypeOf<Entrypoint>();
expectTypeOf(nodeEntrypoint).toEqualTypeOf<Entrypoint>();
expectTypeOf(reactNativeEntrypoint).toEqualTypeOf<Entrypoint>();

expectTypeOf(browserEntrypoint).toEqualTypeOf(nodeEntrypoint);
expectTypeOf(browserEntrypoint).toEqualTypeOf(reactNativeEntrypoint);
expectTypeOf(nodeEntrypoint).toEqualTypeOf(reactNativeEntrypoint);
