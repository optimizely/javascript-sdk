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
  lookup(userId: string): UserProfile | undefined;
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

//TODO: Move OptimizelyDecideOptions to @optimizely/optimizely-sdk/lib/utils/enums
export enum OptimizelyDecideOptions {
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
  // TODO[OASIS-6649]: Don't use object type
  // eslint-disable-next-line  @typescript-eslint/ban-types
  datafile?: object | string;
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
  defaultDecideOptions?: OptimizelyDecideOptions[]
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
 * The options object given to Optimizely.createInstance.
 * Entry level Config Entities
 */
export interface Config {
  // TODO[OASIS-6649]: Don't use object type
  // eslint-disable-next-line  @typescript-eslint/ban-types
  datafile?: object | string;
  datafileOptions?: DatafileOptions;
  errorHandler?: ErrorHandler;
  eventDispatcher?: EventDispatcher;
  logger?: LogHandler;
  logLevel?:
    | LogLevel.DEBUG
    | LogLevel.ERROR
    | LogLevel.INFO
    | LogLevel.NOTSET
    | LogLevel.WARNING;
  // TODO[OASIS-6649]: Don't use object type
  // eslint-disable-next-line  @typescript-eslint/ban-types
  jsonSchemaValidator?: object;
  userProfileService?: UserProfileService | null;
  eventBatchSize?: number;
  eventFlushInterval?: number;
  sdkKey?: string;
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
