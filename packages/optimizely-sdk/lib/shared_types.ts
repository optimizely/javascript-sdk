/**
 * Copyright 2020-2021, Optimizely
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
import { ErrorHandler, LogHandler, LogLevel } from "@optimizely/js-sdk-logging";

export type UserAttributes = {
  // TODO[OASIS-6649]: Don't use any type
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  [name: string]: any;
}

// Information about past bucketing decisions for a user.
export interface UserProfile {
  user_id: string;
  experiment_bucket_map: {
    [experiment_id: string]: {
      variation_id: string;
    };
  };
}

export type EventTags = {
  [key: string]: string | number | null;
};

export interface UserProfileService {
  lookup(userId: string): UserProfile;
  save(profile: UserProfile): void;
}

export interface DatafileOptions {
  autoUpdate?: boolean;
  updateInterval?: number;
  urlTemplate?: string;
  datafileAccessToken?: string;
}

export interface ListenerPayload {
  userId: string;
  attributes?: UserAttributes;
}

export type NotificationListener<T extends ListenerPayload> = (notificationData: T) => void;

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
  dispatchEvent: (event: Event, callback: (response: { statusCode: number; }) => void) => void;
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
  variationKeyMap: { [key: string]: Variation }
}

export interface FeatureVariable {
  type: string;
  key: string;
  id: string;
  defaultValue: string;
}

export interface FeatureFlag {
  rolloutId: string;
  key: string;
  id: string;
  experimentIds: string[],
  variables: FeatureVariable[],
  variableKeyMap: { [key: string]: FeatureVariable }
}

export interface FeatureKeyMap {
  [key: string]: FeatureFlag
}

export interface OnReadyResult {
  success: boolean;
  reason?: string;
}

export type ObjectWithUnknownProperties = {
  [key: string]: unknown;
}

export interface Rollout {
  id: string;
  experiments: Experiment[];
}

//TODO: Move OptimizelyDecideOption to @optimizely/optimizely-sdk/lib/utils/enums
export enum OptimizelyDecideOption {
  DISABLE_DECISION_EVENT = 'DISABLE_DECISION_EVENT',
  ENABLED_FLAGS_ONLY =  'ENABLED_FLAGS_ONLY',
  IGNORE_USER_PROFILE_SERVICE = 'IGNORE_USER_PROFILE_SERVICE',
  INCLUDE_REASONS = 'INCLUDE_REASONS',
  EXCLUDE_VARIABLES = 'EXCLUDE_VARIABLES'
}

/**
 * options required to create optimizely object
 */
export interface OptimizelyOptions {
  UNSTABLE_conditionEvaluators?: unknown;
  clientEngine: string;
  clientVersion?: string;
  datafile?: string;
  datafileOptions?: DatafileOptions;
  errorHandler: ErrorHandler;
  eventBatchSize?: number;
  eventDispatcher: EventDispatcher;
  eventFlushInterval?: number;
  eventMaxQueueSize?: number;
  isValidInstance: boolean;
  // TODO[OASIS-6649]: Don't use object type
  // eslint-disable-next-line  @typescript-eslint/ban-types
  jsonSchemaValidator?: object;
  logger: LogHandler;
  sdkKey?: string;
  userProfileService?: UserProfileService | null;
  defaultDecideOptions?: OptimizelyDecideOption[]
}

/**
 * Optimizely Config Entities
 */
export interface OptimizelyExperiment {
  id: string;
  key: string;
  variationsMap: {
    [variationKey: string]: OptimizelyVariation;
  };
}

export interface OptimizelyVariable {
  id: string;
  key: string;
  type: string;
  value: string;
}

/**
 * Entry level Config Entities
 */
export interface SDKOptions {
  // Datafile string
  datafile?: string;
  // errorHandler object for logging error
  errorHandler?: ErrorHandler;
  // limit of events to dispatch in a batch
  eventBatchSize?: number;
  // event dispatcher function
  eventDispatcher?: EventDispatcher;
  // maximum time for an event to stay in the queue
  eventFlushInterval?: number;
  // flag to validate if this instance is valid
  isValidInstance: boolean;
  // level of logging i.e debug, info, error, warning etc
  logLevel?: LogLevel | string;
  // LogHandler object for logging
  logger?: LogHandler;
  // sdk key
  sdkKey?: string;
  // user profile that contains user information
  userProfileService?: UserProfileService;
  // dafault options for decide API
  defaultDecideOptions?: OptimizelyDecideOption[];
}

export type OptimizelyExperimentsMap = {
  [experimentKey: string]: OptimizelyExperiment;
}

export type OptimizelyVariablesMap = {
  [variableKey: string]: OptimizelyVariable;
}

export type OptimizelyFeaturesMap = {
  [featureKey: string]: OptimizelyFeature;
}

export interface OptimizelyFeature {
  id: string;
  key: string;
  experimentsMap: OptimizelyExperimentsMap;
  variablesMap: OptimizelyVariablesMap;
}

export interface OptimizelyVariation {
  id: string;
  key: string;
  featureEnabled?: boolean;
  variablesMap: OptimizelyVariablesMap;
}

export interface OptimizelyConfig {
  experimentsMap: OptimizelyExperimentsMap;
  featuresMap: OptimizelyFeaturesMap;
  revision: string;
  getDatafile(): string;
}
