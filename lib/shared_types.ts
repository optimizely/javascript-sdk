/**
 * Copyright 2020-2024, Optimizely
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

/**
 * This file contains the shared type definitions collected from the SDK.
 * These shared type definitions include ones that will be referenced by external consumers via export_types.ts.
 */

import { ErrorHandler, LogHandler, LogLevel, LoggerFacade } from './modules/logging';
import { EventProcessor } from './modules/event_processor';

import { NotificationCenter as NotificationCenterImpl } from './core/notification_center';
import { NOTIFICATION_TYPES } from './utils/enums';

import { IOptimizelyUserContext as OptimizelyUserContext } from './optimizely_user_context';

import { ICache } from './utils/lru_cache';
import { RequestHandler } from './utils/http_request_handler/http';
import { OptimizelySegmentOption } from './core/odp/optimizely_segment_option';
import { IOdpSegmentApiManager } from './core/odp/odp_segment_api_manager';
import { IOdpSegmentManager } from './core/odp/odp_segment_manager';
import { IOdpEventApiManager } from './core/odp/odp_event_api_manager';
import { IOdpEventManager } from './core/odp/odp_event_manager';
import { IOdpManager } from './core/odp/odp_manager';
import { IUserAgentParser } from './core/odp/user_agent_parser';
import PersistentCache from './plugins/key_value_cache/persistentKeyValueCache';
import { ProjectConfig } from './core/project_config';

export interface BucketerParams {
  experimentId: string;
  experimentKey: string;
  userId: string;
  trafficAllocationConfig: TrafficAllocation[];
  experimentKeyMap: { [key: string]: Experiment };
  experimentIdMap: { [id: string]: Experiment };
  groupIdMap: { [key: string]: Group };
  variationIdMap: { [id: string]: Variation };
  logger: LogHandler;
  bucketingId: string;
}

export interface DecisionResponse<T> {
  readonly result: T;
  readonly reasons: (string | number)[][];
}

export type UserAttributeValue = string | number | boolean | null;

export type UserAttributes = {
  [name: string]: UserAttributeValue;
};

export interface ExperimentBucketMap {
  [experiment_id: string]: { variation_id: string };
}

// Information about past bucketing decisions for a user.
export interface UserProfile {
  user_id: string;
  experiment_bucket_map: ExperimentBucketMap;
}

export type EventTags = {
  [key: string]: string | number | null;
};

export interface UserProfileService {
  lookup(userId: string): UserProfile;
  save(profile: UserProfile): void;
}

export interface DatafileManagerConfig {
  sdkKey: string;
  datafile?: string;
}

export interface DatafileOptions {
  autoUpdate?: boolean;
  updateInterval?: number;
  urlTemplate?: string;
  datafileAccessToken?: string;
}

export interface OdpOptions {
  disabled?: boolean;
  segmentsCache?: ICache<string, string[]>;
  segmentsCacheSize?: number;
  segmentsCacheTimeout?: number;
  segmentsApiTimeout?: number;
  segmentsRequestHandler?: RequestHandler;
  segmentManager?: IOdpSegmentManager;
  eventFlushInterval?: number;
  eventBatchSize?: number;
  eventQueueSize?: number;
  eventApiTimeout?: number;
  eventRequestHandler?: RequestHandler;
  eventManager?: IOdpEventManager;
  userAgentParser?: IUserAgentParser;
}

export interface ListenerPayload {
  userId: string;
  attributes?: UserAttributes;
}

export type NotificationListener<T extends ListenerPayload> = (notificationData: T) => void;

// NotificationCenter-related types
export interface NotificationCenter {
  addNotificationListener<T extends ListenerPayload>(
    notificationType: string,
    callback: NotificationListener<T>
  ): number;
  removeNotificationListener(listenerId: number): boolean;
  clearAllNotificationListeners(): void;
  clearNotificationListeners(notificationType: NOTIFICATION_TYPES): void;
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
  dispatchEvent: (event: Event, callback: (response: { statusCode: number }) => void) => void;
}

export interface VariationVariable {
  id: string;
  value: string;
}

export interface Variation {
  id: string;
  key: string;
  featureEnabled?: boolean;
  variablesMap: OptimizelyVariablesMap;
  variables?: VariationVariable[];
}

export interface Experiment {
  id: string;
  key: string;
  variations: Variation[];
  variationKeyMap: { [key: string]: Variation };
  groupId?: string;
  layerId: string;
  status: string;
  audienceConditions: Array<string | string[]>;
  audienceIds: string[];
  trafficAllocation: TrafficAllocation[];
  forcedVariations?: { [key: string]: string };
}

export enum VariableType {
  BOOLEAN = 'boolean',
  DOUBLE = 'double',
  INTEGER = 'integer',
  STRING = 'string',
  JSON = 'json',
}

export interface FeatureVariable {
  type: VariableType;
  key: string;
  id: string;
  defaultValue: string;
  subType?: string;
}

export interface FeatureFlag {
  rolloutId: string;
  key: string;
  id: string;
  experimentIds: string[];
  variables: FeatureVariable[];
  variableKeyMap: { [key: string]: FeatureVariable };
  groupId?: string;
}

export type Condition = {
  name: string;
  type: string;
  match?: string;
  value: string | number | boolean | null;
};

export interface Audience {
  id: string;
  name: string;
  conditions: unknown[] | string;
}

export interface Integration {
  key: string;
  host?: string;
  publicKey?: string;
  pixelUrl?: string;
}

export interface TrafficAllocation {
  entityId: string;
  endOfRange: number;
}

export interface Group {
  id: string;
  policy: string;
  trafficAllocation: TrafficAllocation[];
  experiments: Experiment[];
}

export interface TrafficAllocation {
  entityId: string;
  endOfRange: number;
}

export interface Group {
  id: string;
  policy: string;
  trafficAllocation: TrafficAllocation[];
  experiments: Experiment[];
}

export interface FeatureKeyMap {
  [key: string]: FeatureFlag;
}

export interface OnReadyResult {
  success: boolean;
  reason?: string;
}

export type ObjectWithUnknownProperties = {
  [key: string]: unknown;
};

export interface Rollout {
  id: string;
  experiments: Experiment[];
}

//TODO: Move OptimizelyDecideOption to @optimizely/optimizely-sdk/lib/utils/enums
export enum OptimizelyDecideOption {
  DISABLE_DECISION_EVENT = 'DISABLE_DECISION_EVENT',
  ENABLED_FLAGS_ONLY = 'ENABLED_FLAGS_ONLY',
  IGNORE_USER_PROFILE_SERVICE = 'IGNORE_USER_PROFILE_SERVICE',
  INCLUDE_REASONS = 'INCLUDE_REASONS',
  EXCLUDE_VARIABLES = 'EXCLUDE_VARIABLES',
}

/**
 * options required to create optimizely object
 */
export interface OptimizelyOptions {
  UNSTABLE_conditionEvaluators?: unknown;
  clientEngine: string;
  clientVersion?: string;
  // TODO[OASIS-6649]: Don't use object type
  // eslint-disable-next-line  @typescript-eslint/ban-types
  datafile?: string | object;
  datafileManager?: DatafileManager;
  errorHandler: ErrorHandler;
  eventProcessor: EventProcessor;
  isValidInstance: boolean;
  jsonSchemaValidator?: {
    validate(jsonObject: unknown): boolean;
  };
  logger: LoggerFacade;
  sdkKey?: string;
  userProfileService?: UserProfileService | null;
  defaultDecideOptions?: OptimizelyDecideOption[];
  odpManager?: IOdpManager;
  notificationCenter: NotificationCenterImpl;
}

/**
 * Optimizely Config Entities
 */
export interface OptimizelyExperiment {
  id: string;
  key: string;
  audiences: string;
  variationsMap: {
    [variationKey: string]: OptimizelyVariation;
  };
}

export type FeatureVariableValue = number | string | boolean | object | null;

export interface OptimizelyVariable {
  id: string;
  key: string;
  type: string;
  value: string;
}

export interface Client {
  // TODO: In the future, will add a function to allow overriding the VUID.
  getVuid(): string | undefined;
  createUserContext(userId?: string, attributes?: UserAttributes): OptimizelyUserContext | null;
  notificationCenter: NotificationCenter;
  activate(experimentKey: string, userId: string, attributes?: UserAttributes): string | null;
  track(eventKey: string, userId: string, attributes?: UserAttributes, eventTags?: EventTags): void;
  getVariation(experimentKey: string, userId: string, attributes?: UserAttributes): string | null;
  setForcedVariation(experimentKey: string, userId: string, variationKey: string | null): boolean;
  getForcedVariation(experimentKey: string, userId: string): string | null;
  isFeatureEnabled(featureKey: string, userId: string, attributes?: UserAttributes): boolean;
  getEnabledFeatures(userId: string, attributes?: UserAttributes): string[];
  getFeatureVariable(featureKey: string, variableKey: string, userId: string, attributes?: UserAttributes): FeatureVariableValue;
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
  getFeatureVariableJSON(featureKey: string, variableKey: string, userId: string, attributes?: UserAttributes): unknown;
  getAllFeatureVariables(
    featureKey: string,
    userId: string,
    attributes?: UserAttributes
  ): { [variableKey: string]: unknown } | null;
  getOptimizelyConfig(): OptimizelyConfig | null;
  onReady(options?: { timeout?: number }): Promise<{ success: boolean; reason?: string }>;
  close(): Promise<{ success: boolean; reason?: string }>;
  sendOdpEvent(action: string, type?: string, identifiers?: Map<string, string>, data?: Map<string, unknown>): void;
  getProjectConfig(): ProjectConfig | null;
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

export type PersistentCacheProvider = () => PersistentCache;

/**
 * Entry level Config Entities
 * For compatibility with the previous declaration file
 */
export interface Config extends ConfigLite {
  datafileOptions?: DatafileOptions; // Options for Datafile Manager
  eventBatchSize?: number; // Maximum size of events to be dispatched in a batch
  eventFlushInterval?: number; // Maximum time for an event to be enqueued
  eventMaxQueueSize?: number; // Maximum size for the event queue
  sdkKey?: string;
  odpOptions?: OdpOptions;
  persistentCacheProvider?: PersistentCacheProvider;
}

/**
 * Entry level Config Entities for Lite bundle
 * For compatibility with the previous declaration file
 */
export interface ConfigLite {
  // Datafile string
  // TODO[OASIS-6649]: Don't use object type
  // eslint-disable-next-line  @typescript-eslint/ban-types
  datafile?: object | string;
  // errorHandler object for logging error
  errorHandler?: ErrorHandler;
  // event dispatcher function
  eventDispatcher?: EventDispatcher;
  // event dispatcher to use when closing
  closingEventDispatcher?: EventDispatcher;
  // The object to validate against the schema
  jsonSchemaValidator?: {
    validate(jsonObject: unknown): boolean;
  };
  // level of logging i.e debug, info, error, warning etc
  logLevel?: LogLevel | string;
  // LogHandler object for logging
  logger?: LogHandler;
  // user profile that contains user information
  userProfileService?: UserProfileService;
  // dafault options for decide API
  defaultDecideOptions?: OptimizelyDecideOption[];
  clientEngine?: string;
  clientVersion?: string;
}

export type OptimizelyExperimentsMap = {
  [experimentKey: string]: OptimizelyExperiment;
};

export type OptimizelyVariablesMap = {
  [variableKey: string]: OptimizelyVariable;
};

export type OptimizelyFeaturesMap = {
  [featureKey: string]: OptimizelyFeature;
};

export type OptimizelyAttribute = {
  id: string;
  key: string;
};

export type OptimizelyAudience = {
  id: string;
  name: string;
  conditions: string;
};

export type OptimizelyEvent = {
  id: string;
  key: string;
  experimentsIds: string[];
};

export interface OptimizelyFeature {
  id: string;
  key: string;
  experimentRules: OptimizelyExperiment[];
  deliveryRules: OptimizelyExperiment[];
  variablesMap: OptimizelyVariablesMap;

  /**
   * @deprecated Use experimentRules and deliveryRules
   */
  experimentsMap: OptimizelyExperimentsMap;
}

export interface OptimizelyVariation {
  id: string;
  key: string;
  featureEnabled?: boolean;
  variablesMap: OptimizelyVariablesMap;
}

export interface OptimizelyConfig {
  environmentKey: string;
  sdkKey: string;
  revision: string;

  /**
   * This experimentsMap is for experiments of legacy projects only.
   * For flag projects, experiment keys are not guaranteed to be unique
   * across multiple flags, so this map may not include all experiments
   * when keys conflict.
   */
  experimentsMap: OptimizelyExperimentsMap;

  featuresMap: OptimizelyFeaturesMap;
  attributes: OptimizelyAttribute[];
  audiences: OptimizelyAudience[];
  events: OptimizelyEvent[];
  getDatafile(): string;
}

export { OptimizelyUserContext };

export interface OptimizelyDecision {
  variationKey: string | null;
  // The boolean value indicating if the flag is enabled or not
  enabled: boolean;
  // The collection of variables associated with the decision
  variables: { [variableKey: string]: unknown };
  // The rule key of the decision
  ruleKey: string | null;
  // The flag key for which the decision has been made for
  flagKey: string;
  // A copy of the user context for which the decision has been made for
  userContext: OptimizelyUserContext;
  // An array of error/info messages describing why the decision has been made.
  reasons: string[];
}

export interface DatafileUpdate {
  datafile: string;
}

export interface DatafileUpdateListener {
  (datafileUpdate: DatafileUpdate): void;
}

// TODO: Replace this with the one from js-sdk-models
interface Managed {
  start(): void;

  stop(): Promise<unknown>;
}

export interface DatafileManager extends Managed {
  get: () => string;
  on(eventName: string, listener: DatafileUpdateListener): () => void;
  onReady: () => Promise<void>;
}

export interface OptimizelyDecisionContext {
  flagKey: string;
  ruleKey?: string;
}

export interface OptimizelyForcedDecision {
  variationKey: string;
}

// ODP Exports

export {
  ICache,
  RequestHandler,
  OptimizelySegmentOption,
  IOdpSegmentApiManager,
  IOdpSegmentManager,
  IOdpEventApiManager,
  IOdpEventManager,
  IOdpManager,
};
