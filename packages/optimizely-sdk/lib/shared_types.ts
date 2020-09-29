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
  [key: string]: string | number | boolean;
};

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

export interface UserProfileService {
  lookup(userId: string): UserProfile;
  save(profile: UserProfile): void;
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

/**
 * Temprorary placement of LogTierV1EventProcessorConfig
 */
export interface LogTierV1EventProcessorConfig {
  dispatcher: import ('@optimizely/js-sdk-event-processor').EventDispatcher;
  flushInterval?: number;
  batchSize?: number;
  notificationCenter?: import('./core/notification_center').NotificationCenter;
  maxQueueSize?: number;
}
