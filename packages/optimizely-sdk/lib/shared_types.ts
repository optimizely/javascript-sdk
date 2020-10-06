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

export interface OnReadyResult {
  success: boolean;
  reason?: string;
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

export interface Config {
  datafile?: string;
  errorHandler?: ErrorHandler;
  eventDispatcher?: EventDispatcher;
  logger?: LogHandler;
  logLevel?: LogLevel;
  userProfileService?: UserProfileService;
  eventBatchSize?: number;
  eventFlushInterval?: number;
  sdkKey?: string;
  isValidInstance?: boolean;
}

export interface configObj {
  clientEngine: string;
  clientVersion?: string;
  errorHandler: ErrorHandler;
  eventDispatcher: EventDispatcher;
  isValidInstance: boolean;
  datafile?: string;
  // TODO[OASIS-6649]: Don't use object type
  // eslint-disable-next-line  @typescript-eslint/ban-types
  jsonSchemaValidator?: object;
  sdkKey?: string;
  userProfileService?: UserProfileService | null;
  UNSTABLE_conditionEvaluators?: unknown;
  eventFlushInterval?: number;
  eventBatchSize?: number;
  datafileOptions?: DatafileOptions;
  eventMaxQueueSize?: number;
  logger: LogHandler;
}

export interface OptimizelyFeature {
  id: string;
  key: string;
  experimentsMap: {
    [experimentKey: string]: OptimizelyExperiment;
  };
  variablesMap: {
    [variableKey: string]: OptimizelyVariable;
  };
}

export interface OptimizelyVariation {
  id: string;
  key: string;
  featureEnabled?: boolean;
  variablesMap: {
    [variableKey: string]: OptimizelyVariable;
  };
}

export interface OptimizelyConfig {
  experimentsMap: {
    [experimentKey: string]: OptimizelyExperiment;
  };
  featuresMap: {
    [featureKey: string]: OptimizelyFeature;
  };
  revision: string;
  getDatafile(): string;
}
