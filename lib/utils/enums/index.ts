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

export { NOTIFICATION_TYPES } from '../../notification_center/type';

/**
 * Default milliseconds before request timeout
 */
export const REQUEST_TIMEOUT_MS = 60 * 1000; // 1 minute



