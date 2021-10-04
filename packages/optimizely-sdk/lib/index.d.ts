/**
 * Copyright 2018-2020, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

declare module '@optimizely/optimizely-sdk' {
  import { LogHandler, ErrorHandler } from '@optimizely/js-sdk-logging';
  import * as enums from '@optimizely/optimizely-sdk/lib/utils/enums';
  import * as logging from '@optimizely/optimizely-sdk/lib/plugins/logger';

  export { enums, logging };

  export function setLogger(logger: LogHandler | null): void;

  export function setLogLevel(level: enums.LOG_LEVEL | string): void;

  export function createInstance(config: Config): Client;

  export const errorHandler: ErrorHandler;

  export const eventDispatcher: EventDispatcher;

  export type UserAttributes = import('./shared_types').UserAttributes;

  export type OptimizelyConfig = import('./shared_types').OptimizelyConfig;

  export type OptimizelyVariable = import('./shared_types').OptimizelyVariable;

  export type OptimizelyVariation = import('./shared_types').OptimizelyVariation;

  export type OptimizelyExperiment = import('./shared_types').OptimizelyExperiment;

  export type OptimizelyFeature = import('./shared_types').OptimizelyFeature;

  export type EventTags = import('./shared_types').EventTags;

  export type Event = import('./shared_types').Event;

  export type EventDispatcher = import('./shared_types').EventDispatcher;

  export type DatafileOptions = import('./shared_types').DatafileOptions;

  export type SDKOptions = import('./shared_types').SDKOptions;

  export type OptimizelyOptions = import('./shared_types').OptimizelyOptions;

  export type UserProfileService = import('./shared_types').UserProfileService;

  export type UserProfile = import('./shared_types').UserProfile;

  export type ListenerPayload = import('./shared_types').ListenerPayload;

  export type OptimizelyDecision = import('./shared_types').OptimizelyDecision;

  export type OptimizelyUserContext = import('./shared_types').OptimizelyUserContext;

  export enum OptimizelyDecideOption {
    DISABLE_DECISION_EVENT = 'DISABLE_DECISION_EVENT',
    ENABLED_FLAGS_ONLY = 'ENABLED_FLAGS_ONLY',
    IGNORE_USER_PROFILE_SERVICE = 'IGNORE_USER_PROFILE_SERVICE',
    INCLUDE_REASONS = 'INCLUDE_REASONS',
    EXCLUDE_VARIABLES = 'EXCLUDE_VARIABLES'
  }

  export type NotificationListener<T extends ListenerPayload> = import('./shared_types').NotificationListener<T>;

  // The options object given to Optimizely.createInstance.
  export interface Config {
    // TODO[OASIS-6649]: Don't use object type
    // eslint-disable-next-line  @typescript-eslint/ban-types
    datafile?: object | string;
    datafileOptions?: DatafileOptions;
    errorHandler?: ErrorHandler;
    eventDispatcher?: EventDispatcher;
    logger?: LogHandler;
    logLevel?:
      | string
      | enums.LOG_LEVEL.DEBUG
      | enums.LOG_LEVEL.ERROR
      | enums.LOG_LEVEL.INFO
      | enums.LOG_LEVEL.NOTSET
      | enums.LOG_LEVEL.WARNING;
    jsonSchemaValidator?: {
      validate(jsonObject: unknown): boolean,
    };
    userProfileService?: UserProfileService | null;
    eventBatchSize?: number;
    eventFlushInterval?: number;
    sdkKey?: string;
    defaultDecideOptions?: OptimizelyDecideOption[]
  }

  export interface Client {
    notificationCenter: NotificationCenter;
    createUserContext(
      userId: string,
      attributes?: UserAttributes
    ): OptimizelyUserContext | null;
    activate(
      experimentKey: string,
      userId: string,
      attributes?: UserAttributes
    ): string | null;
    track(
      eventKey: string,
      userId: string,
      attributes?: UserAttributes,
      eventTags?: EventTags
    ): void;
    getVariation(
      experimentKey: string,
      userId: string,
      attributes?: UserAttributes
    ): string | null;
    setForcedVariation(experimentKey: string, userId: string, variationKey: string | null): boolean;
    getForcedVariation(experimentKey: string, userId: string): string | null;
    isFeatureEnabled(
      featureKey: string,
      userId: string,
      attributes?: UserAttributes
    ): boolean;
    getEnabledFeatures(
      userId: string,
      attributes?: UserAttributes
    ): string[];
    getFeatureVariable(
      featureKey: string,
      variableKey: string,
      userId: string,
      attributes?: UserAttributes
    ): unknown;
    getFeatureVariableBoolean(
      featureKey: string,
      variableKey: string,
      userId: string,
      attributes?: UserAttributes
    ): boolean | null;
    getFeatureVariableDouble(
      featureKey: string,
      variableKey: string,
      userId: string,
      attributes?: UserAttributes
    ): number | null;
    getFeatureVariableInteger(
      featureKey: string,
      variableKey: string,
      userId: string,
      attributes?: UserAttributes
    ): number | null;
    getFeatureVariableString(
      featureKey: string,
      variableKey: string,
      userId: string,
      attributes?: UserAttributes
    ): string | null;
    getFeatureVariableJSON(
      featureKey: string,
      variableKey: string,
      userId: string,
      attributes?: UserAttributes
    ): unknown;
    getAllFeatureVariables(
      featureKey: string,
      userId: string,
      attributes?: UserAttributes
    ): { [variableKey: string]: unknown } | null;
    getOptimizelyConfig(): OptimizelyConfig | null;
    onReady(options?: { timeout?: number }): Promise<{ success: boolean; reason?: string }>;
    close(): Promise<{ success: boolean; reason?: string }>;
  }

  // NotificationCenter-related types
  export interface NotificationCenter {
    addNotificationListener<T extends ListenerPayload>(
      notificationType: string,
      callback: NotificationListener<T>
    ): number;
    removeNotificationListener(listenerId: number): boolean;
    clearAllNotificationListeners(): void;
    clearNotificationListeners(notificationType: enums.NOTIFICATION_TYPES): void;
  }

  export interface ActivateListenerPayload extends ListenerPayload {
    experiment: import('./shared_types').Experiment;
    variation: import('./shared_types').Variation;
    logEvent: Event;
  }

  export interface TrackListenerPayload extends ListenerPayload {
    eventKey: string;
    eventTags: EventTags;
    logEvent: Event;
  }
}

declare module '@optimizely/optimizely-sdk/lib/utils/enums' {
  import { LogLevel } from '@optimizely/js-sdk-logging';

  export { LogLevel as LOG_LEVEL };

  export enum NOTIFICATION_TYPES {
    ACTIVATE = 'ACTIVATE:experiment, user_id,attributes, variation, event',
    DECISION = 'DECISION:type, userId, attributes, decisionInfo',
    OPTIMIZELY_CONFIG_UPDATE = 'OPTIMIZELY_CONFIG_UPDATE',
    TRACK = 'TRACK:event_key, user_id, attributes, event_tags, event',
    LOG_EVENT = "LOG_EVENT:logEvent"
  }
}

declare module '@optimizely/optimizely-sdk/lib/plugins/logger' {
  import * as enums from '@optimizely/optimizely-sdk/lib/utils/enums';
  import { LogHandler } from '@optimizely/js-sdk-logging';

  export interface LoggerConfig {
    logLevel?: enums.LOG_LEVEL | string;
    logToConsole?: boolean;
    prefix?: string;
  }
  export function createLogger(config?: LoggerConfig): LogHandler;
  export function createNoOpLogger(): LogHandler;
}

declare module '@optimizely/optimizely-sdk/lib/plugins/event_dispatcher' {}

declare module '@optimizely/optimizely-sdk/lib/utils/json_schema_validator' {}

declare module '@optimizely/optimizely-sdk/lib/plugins/error_handler' {}
