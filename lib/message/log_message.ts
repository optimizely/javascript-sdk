/**
 * Copyright 2024, Optimizely
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

export const FEATURE_ENABLED_FOR_USER = 'Feature %s is enabled for user %s.';
export const FEATURE_NOT_ENABLED_FOR_USER = 'Feature %s is not enabled for user %s.';
export const FAILED_TO_PARSE_VALUE = 'Failed to parse event value "%s" from event tags.';
export const FAILED_TO_PARSE_REVENUE = 'Failed to parse revenue value "%s" from event tags.';
export const INVALID_CLIENT_ENGINE = 'Invalid client engine passed: %s. Defaulting to node-sdk.';
export const INVALID_DEFAULT_DECIDE_OPTIONS = 'Provided default decide options is not an array.';
export const INVALID_DECIDE_OPTIONS = 'Provided decide options is not an array. Using default decide options.';
export const NOT_ACTIVATING_USER = 'Not activating user %s for experiment %s.';
export const PARSED_REVENUE_VALUE = 'Parsed revenue value "%s" from event tags.';
export const PARSED_NUMERIC_VALUE = 'Parsed event value "%s" from event tags.';
export const SAVED_USER_VARIATION = 'Saved user profile for user "%s".';
export const SAVED_VARIATION_NOT_FOUND =
  'User %s was previously bucketed into variation with ID %s for experiment %s, but no matching variation was found.';
export const SHOULD_NOT_DISPATCH_ACTIVATE = 'Experiment %s is not in "Running" state. Not activating user.';
export const SKIPPING_JSON_VALIDATION = 'Skipping JSON schema validation.';
export const TRACK_EVENT = 'Tracking event %s for user %s.';
export const USER_MAPPED_TO_FORCED_VARIATION =
  'Set variation %s for experiment %s and user %s in the forced variation map.';
export const USER_HAS_NO_FORCED_VARIATION = 'User %s is not in the forced variation map.';
export const USER_RECEIVED_DEFAULT_VARIABLE_VALUE =
  'User "%s" is not in any variation or rollout rule. Returning default value for variable "%s" of feature flag "%s".';
export const FEATURE_NOT_ENABLED_RETURN_DEFAULT_VARIABLE_VALUE =
  'Feature "%s" is not enabled for user %s. Returning the default variable value "%s".';
export const VARIABLE_NOT_USED_RETURN_DEFAULT_VARIABLE_VALUE =
  'Variable "%s" is not used in variation "%s". Returning default value.';
export const USER_RECEIVED_VARIABLE_VALUE = 'Got variable value "%s" for variable "%s" of feature flag "%s"';
export const VALID_DATAFILE = 'Datafile is valid.';
export const VALID_USER_PROFILE_SERVICE = 'Valid user profile service provided.';
export const VARIATION_REMOVED_FOR_USER = 'Variation mapped to experiment %s has been removed for user %s.';

export const VALID_BUCKETING_ID = 'BucketingId is valid: "%s"';
export const EVALUATING_AUDIENCE = 'Starting to evaluate audience "%s" with conditions: %s.';
export const AUDIENCE_EVALUATION_RESULT = 'Audience "%s" evaluated to %s.';
export const MISSING_ATTRIBUTE_VALUE =
  'Audience condition %s evaluated to UNKNOWN because no value was passed for user attribute "%s".';
export const UNEXPECTED_TYPE_NULL =
  'Audience condition %s evaluated to UNKNOWN because a null value was passed for user attribute "%s".';
export const UPDATED_OPTIMIZELY_CONFIG = 'Updated Optimizely config to revision %s (project id %s)';
export const ADDING_AUTHORIZATION_HEADER_WITH_BEARER_TOKEN = 'Adding Authorization header with Bearer Token';
export const MAKING_DATAFILE_REQ_TO_URL_WITH_HEADERS = 'Making datafile request to url %s with headers: %s';
export const RESPONSE_STATUS_CODE = 'Response status code: %s';
export const SAVED_LAST_MODIFIED_HEADER_VALUE_FROM_RESPONSE  = 'Saved last modified header value from response: %s';
export const USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT =
  'No experiment %s mapped to user %s in the forced variation map.';
export const INVALID_EXPERIMENT_KEY_INFO =
  'Experiment key %s is not in datafile. It is either invalid, paused, or archived.';
export const EVENT_STORE_FULL = 'Event store is full. Not saving event with id %d.';

export const messages: string[] = [];
