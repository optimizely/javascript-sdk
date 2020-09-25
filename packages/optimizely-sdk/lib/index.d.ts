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

  interface DatafileOptions {
    autoUpdate?: boolean;
    updateInterval?: number;
    urlTemplate?: string;
    datafileAccessToken?: string;
  }

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
      | enums.LOG_LEVEL.DEBUG
      | enums.LOG_LEVEL.ERROR
      | enums.LOG_LEVEL.INFO
      | enums.LOG_LEVEL.NOTSET
      | enums.LOG_LEVEL.WARNING;
    // TODO[OASIS-6649]: Don't use object type
    // eslint-disable-next-line  @typescript-eslint/ban-types
    jsonSchemaValidator?: object;
    userProfileService?: import('./shared_types').UserProfileService | null;
    eventBatchSize?: number;
    eventFlushInterval?: number;
    sdkKey?: string;
  }

  export interface Client {
    notificationCenter: NotificationCenter;
    activate(
      experimentKey: string,
      userId: string,
      attributes?: import('./shared_types').UserAttributes
    ): string | null;
    track(
      eventKey: string,
      userId: string,
      attributes?: import('./shared_types').UserAttributes,
      eventTags?: import('./shared_types').EventTags
    ): void;
    getVariation(
      experimentKey: string,
      userId: string,
      attributes?: import('./shared_types').UserAttributes
    ): string | null;
    setForcedVariation(experimentKey: string, userId: string, variationKey: string | null): boolean;
    getForcedVariation(experimentKey: string, userId: string): string | null;
    isFeatureEnabled(
      featureKey: string,
      userId: string,
      attributes?: import('./shared_types').UserAttributes
    ): boolean;
    getEnabledFeatures(
      userId: string,
      attributes?: import('./shared_types').UserAttributes
    ): string[];
    getFeatureVariable(
      featureKey: string,
      variableKey: string,
      userId: string,
      attributes?: import('./shared_types').UserAttributes
    ): unknown;
    getFeatureVariableBoolean(
      featureKey: string,
      variableKey: string,
      userId: string,
      attributes?: import('./shared_types').UserAttributes
    ): boolean | null;
    getFeatureVariableDouble(
      featureKey: string,
      variableKey: string,
      userId: string,
      attributes?: import('./shared_types').UserAttributes
    ): number | null;
    getFeatureVariableInteger(
      featureKey: string,
      variableKey: string,
      userId: string,
      attributes?: import('./shared_types').UserAttributes
    ): number | null;
    getFeatureVariableString(
      featureKey: string,
      variableKey: string,
      userId: string,
      attributes?: import('./shared_types').UserAttributes
    ): string | null;
    getFeatureVariableJSON(
      featureKey: string,
      variableKey: string,
      userId: string,
      attributes?: import('./shared_types').UserAttributes
    ): unknown;
    getAllFeatureVariables(
      featureKey: string,
      userId: string,
      attributes?: import('./shared_types').UserAttributes
    ): { [variableKey: string]: unknown };
    getOptimizelyConfig(): import('./shared_types').OptimizelyConfig | null;
    onReady(options?: { timeout?: number }): Promise<{ success: boolean; reason?: string }>;
    close(): Promise<{ success: boolean; reason?: string }>;
  }

  // An event to be submitted to Optimizely, enabling tracking the reach and impact of
  // tests and feature rollouts.
  export interface Event {
    // URL to which to send the HTTP request.
    url: string;
    // HTTP method with which to send the event.
    httpVerb: 'POST';
    // Value to send in the request body, JSON-serialized.
    // TODO[OASIS-6649]: Don't use any type
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    params: any;
  }

  export interface EventDispatcher {
    /**
     * @param event
     *        Event being submitted for eventual dispatch.
     * @param callback
     *        After the event has at least been queued for dispatch, call this function to return
     *        control back to the Client.
     */
    dispatchEvent: (event: Event, callback: () => void) => void;
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

  export type NotificationListener<T extends ListenerPayload> = (notificationData: T) => void;

  export interface ListenerPayload {
    userId: string;
    attributes: import('./shared_types').UserAttributes;
  }

  export interface ActivateListenerPayload extends ListenerPayload {
    experiment: import('./shared_types').Experiment;
    variation: import('./shared_types').Variation;
    logEvent: Event;
  }

  export interface TrackListenerPayload extends ListenerPayload {
    eventKey: string;
    eventTags: import('./shared_types').EventTags;
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
  }
}

declare module '@optimizely/optimizely-sdk/lib/plugins/logger' {
  import * as enums from '@optimizely/optimizely-sdk/lib/utils/enums';
  import { LogHandler } from '@optimizely/js-sdk-logging';

  export interface LoggerConfig {
    logLevel?: enums.LOG_LEVEL;
    logToConsole?: boolean;
    prefix?: string;
  }
  export function createLogger(config?: LoggerConfig): LogHandler;
  export function createNoOpLogger(): LogHandler;
}

declare module '@optimizely/optimizely-sdk/lib/plugins/event_dispatcher' {}

declare module '@optimizely/optimizely-sdk/lib/utils/json_schema_validator' {}

declare module '@optimizely/optimizely-sdk/lib/plugins/error_handler' {}
