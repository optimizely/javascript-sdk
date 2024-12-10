/**
 * Copyright 2016-2024, Optimizely
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
 * Contains global enums used throughout the library
 */
export const LOG_LEVEL = {
  NOTSET: 0,
  DEBUG: 1,
  INFO: 2,
  WARNING: 3,
  ERROR: 4,
};


export const enum RESERVED_EVENT_KEYWORDS {
  REVENUE = 'revenue',
  VALUE = 'value',
}

export const CONTROL_ATTRIBUTES = {
  BOT_FILTERING: '$opt_bot_filtering',
  BUCKETING_ID: '$opt_bucketing_id',
  STICKY_BUCKETING_KEY: '$opt_experiment_bucket_map',
  USER_AGENT: '$opt_user_agent',
  FORCED_DECISION_NULL_RULE_KEY: '$opt_null_rule_key',
};

export const JAVASCRIPT_CLIENT_ENGINE = 'javascript-sdk';
export const NODE_CLIENT_ENGINE = 'node-sdk';
export const REACT_CLIENT_ENGINE = 'react-sdk';
export const REACT_NATIVE_CLIENT_ENGINE = 'react-native-sdk';
export const REACT_NATIVE_JS_CLIENT_ENGINE = 'react-native-js-sdk';
export const CLIENT_VERSION = '5.3.4';

export const DECISION_NOTIFICATION_TYPES = {
  AB_TEST: 'ab-test',
  FEATURE: 'feature',
  FEATURE_TEST: 'feature-test',
  FEATURE_VARIABLE: 'feature-variable',
  ALL_FEATURE_VARIABLES: 'all-feature-variables',
  FLAG: 'flag',
};

/*
 * Represents the source of a decision for feature management. When a feature
 * is accessed through isFeatureEnabled or getVariableValue APIs, the decision
 * source is used to decide whether to dispatch an impression event to
 * Optimizely.
 */
export const DECISION_SOURCES = {
  FEATURE_TEST: 'feature-test',
  ROLLOUT: 'rollout',
  EXPERIMENT: 'experiment',
};

export const AUDIENCE_EVALUATION_TYPES = {
  RULE: 'rule',
  EXPERIMENT: 'experiment',
};

/*
 * Possible types of variables attached to features
 */
export const FEATURE_VARIABLE_TYPES = {
  BOOLEAN: 'boolean',
  DOUBLE: 'double',
  INTEGER: 'integer',
  STRING: 'string',
  JSON: 'json',
};

/*
 * Supported datafile versions
 */
export const DATAFILE_VERSIONS = {
  V2: '2',
  V3: '3',
  V4: '4',
};

/*
 * Pre-Release and Build symbols
 */
export const enum VERSION_TYPE {
  PRE_RELEASE_VERSION_DELIMITER = '-',
  BUILD_VERSION_DELIMITER = '+',
}

export const DECISION_MESSAGES = {
  SDK_NOT_READY: 'Optimizely SDK not configured properly yet.',
  FLAG_KEY_INVALID: 'No flag was found for key "%s".',
  VARIABLE_VALUE_INVALID: 'Variable value for key "%s" is invalid or wrong type.',
};

/*
 * Notification types for use with NotificationCenter
 * Format is EVENT: <list of parameters to callback>
 *
 * SDK consumers can use these to register callbacks with the notification center.
 *
 *  @deprecated since 3.1.0
 *  ACTIVATE: An impression event will be sent to Optimizely
 *  Callbacks will receive an object argument with the following properties:
 *    - experiment {Object}
 *    - userId {string}
 *    - attributes {Object|undefined}
 *    - variation {Object}
 *    - logEvent {Object}
 *
 *  DECISION: A decision is made in the system. i.e. user activation,
 *  feature access or feature-variable value retrieval
 *  Callbacks will receive an object argument with the following properties:
 *    - type {string}
 *    - userId {string}
 *    - attributes {Object|undefined}
 *    - decisionInfo {Object|undefined}
 *
 *  LOG_EVENT: A batch of events, which could contain impressions and/or conversions,
 *  will be sent to Optimizely
 *  Callbacks will receive an object argument with the following properties:
 *    - url {string}
 *    - httpVerb {string}
 *    - params {Object}
 *
 *  OPTIMIZELY_CONFIG_UPDATE: This Optimizely instance has been updated with a new
 *  config
 *
 *  TRACK: A conversion event will be sent to Optimizely
 *  Callbacks will receive the an object argument with the following properties:
 *    - eventKey {string}
 *    - userId {string}
 *    - attributes {Object|undefined}
 *    - eventTags {Object|undefined}
 *    - logEvent {Object}
 *
 */
export enum NOTIFICATION_TYPES {
  ACTIVATE = 'ACTIVATE:experiment, user_id,attributes, variation, event',
  DECISION = 'DECISION:type, userId, attributes, decisionInfo',
  LOG_EVENT = 'LOG_EVENT:logEvent',
  OPTIMIZELY_CONFIG_UPDATE = 'OPTIMIZELY_CONFIG_UPDATE',
  TRACK = 'TRACK:event_key, user_id, attributes, event_tags, event',
}

/**
 * Default milliseconds before request timeout
 */
export const REQUEST_TIMEOUT_MS = 60 * 1000; // 1 minute
export const REQUEST_TIMEOUT_ODP_SEGMENTS_MS = 10 * 1000; // 10 secs
export const REQUEST_TIMEOUT_ODP_EVENTS_MS = 10 * 1000; // 10 secs

/**
 * ODP User Key Options
 */
export enum ODP_USER_KEY {
  VUID = 'vuid',
  FS_USER_ID = 'fs_user_id',
}

/**
 * Alias for fs_user_id to catch for and automatically convert to fs_user_id
 */
export const FS_USER_ID_ALIAS = 'fs-user-id';

export const ODP_DEFAULT_EVENT_TYPE = 'fullstack';

/**
 * ODP Event Action Options
 */
export enum ODP_EVENT_ACTION {
  IDENTIFIED = 'identified',
  INITIALIZED = 'client_initialized',
}
