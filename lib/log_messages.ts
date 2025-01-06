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

export const ACTIVATE_USER = '%s: Activating user %s in experiment %s.';
export const DISPATCH_CONVERSION_EVENT = '%s: Dispatching conversion event to URL %s with params %s.';
export const DISPATCH_IMPRESSION_EVENT = '%s: Dispatching impression event to URL %s with params %s.';
export const DEPRECATED_EVENT_VALUE = '%s: Event value is deprecated in %s call.';
export const EXPERIMENT_NOT_RUNNING = 'Experiment %s is not running.';
export const FEATURE_ENABLED_FOR_USER = 'Feature %s is enabled for user %s.';
export const FEATURE_NOT_ENABLED_FOR_USER = 'Feature %s is not enabled for user %s.';
export const FEATURE_HAS_NO_EXPERIMENTS = 'Feature %s is not attached to any experiments.';
export const FAILED_TO_PARSE_VALUE = '%s: Failed to parse event value "%s" from event tags.';
export const FAILED_TO_PARSE_REVENUE = '%s: Failed to parse revenue value "%s" from event tags.';
export const INVALID_CLIENT_ENGINE = 'Invalid client engine passed: %s. Defaulting to node-sdk.';
export const INVALID_DEFAULT_DECIDE_OPTIONS = '%s: Provided default decide options is not an array.';
export const INVALID_DECIDE_OPTIONS = 'Provided decide options is not an array. Using default decide options.';
export const NO_ROLLOUT_EXISTS = 'There is no rollout of feature %s.';
export const NOT_ACTIVATING_USER = 'Not activating user %s for experiment %s.';
export const ODP_DISABLED = 'ODP Disabled.';
export const ODP_IDENTIFY_FAILED_ODP_DISABLED = '%s: ODP identify event for user %s is not dispatched (ODP disabled).';
export const ODP_IDENTIFY_FAILED_ODP_NOT_INTEGRATED =
  '%s: ODP identify event %s is not dispatched (ODP not integrated).';
export const ODP_SEND_EVENT_IDENTIFIER_CONVERSION_FAILED =
  '%s: sendOdpEvent failed to parse through and convert fs_user_id aliases';
export const PARSED_REVENUE_VALUE = '%s: Parsed revenue value "%s" from event tags.';
export const PARSED_NUMERIC_VALUE = '%s: Parsed event value "%s" from event tags.';
export const RETURNING_STORED_VARIATION =
  'Returning previously activated variation "%s" of experiment "%s" for user "%s" from user profile.';
export const ROLLOUT_HAS_NO_EXPERIMENTS = 'Rollout of feature %s has no experiments';
export const SAVED_USER_VARIATION = 'Saved user profile for user "%s".';
export const UPDATED_USER_VARIATION = '%s: Updated variation "%s" of experiment "%s" for user "%s".';
export const SAVED_VARIATION_NOT_FOUND =
  'User %s was previously bucketed into variation with ID %s for experiment %s, but no matching variation was found.';
export const SHOULD_NOT_DISPATCH_ACTIVATE = 'Experiment %s is not in "Running" state. Not activating user.';
export const SKIPPING_JSON_VALIDATION = 'Skipping JSON schema validation.';
export const TRACK_EVENT = 'Tracking event %s for user %s.';
export const USER_BUCKETED_INTO_TARGETING_RULE = 'User %s bucketed into targeting rule %s.';
export const USER_IN_FEATURE_EXPERIMENT = '%s: User %s is in variation %s of experiment %s on the feature %s.';
export const USER_IN_ROLLOUT = 'User %s is in rollout of feature %s.';
export const USER_NOT_BUCKETED_INTO_EVERYONE_TARGETING_RULE =
  '%s: User %s not bucketed into everyone targeting rule due to traffic allocation.';
export const USER_NOT_BUCKETED_INTO_ANY_EXPERIMENT_IN_GROUP = '%s: User %s is not in any experiment of group %s.';
export const USER_NOT_BUCKETED_INTO_TARGETING_RULE =
  'User %s not bucketed into targeting rule %s due to traffic allocation. Trying everyone rule.';
export const USER_FORCED_IN_VARIATION = '%s: User %s is forced in variation %s.';
export const USER_MAPPED_TO_FORCED_VARIATION =
  'Set variation %s for experiment %s and user %s in the forced variation map.';
export const USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE =
  'User %s does not meet conditions for targeting rule %s.';
export const USER_MEETS_CONDITIONS_FOR_TARGETING_RULE = 'User %s meets conditions for targeting rule %s.';
export const USER_HAS_VARIATION = 'User %s is in variation %s of experiment %s.';
export const USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED =
  'Variation (%s) is mapped to flag (%s), rule (%s) and user (%s) in the forced decision map.';
export const USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED =
  'Variation (%s) is mapped to flag (%s) and user (%s) in the forced decision map.';
export const USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID =
  'Invalid variation is mapped to flag (%s), rule (%s) and user (%s) in the forced decision map.';
export const USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED_BUT_INVALID =
  'Invalid variation is mapped to flag (%s) and user (%s) in the forced decision map.';
export const USER_HAS_FORCED_VARIATION =
  'Variation %s is mapped to experiment %s and user %s in the forced variation map.';
export const USER_HAS_NO_VARIATION = 'User %s is in no variation of experiment %s.';
export const USER_HAS_NO_FORCED_VARIATION = 'User %s is not in the forced variation map.';
export const USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT =
  'No experiment %s mapped to user %s in the forced variation map.';
export const USER_NOT_IN_EXPERIMENT = 'User %s does not meet conditions to be in experiment %s.';
export const USER_NOT_IN_ROLLOUT =  'User %s is not in rollout of feature %s.';
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
export const EVALUATING_AUDIENCE = '%s: Starting to evaluate audience "%s" with conditions: %s.';
export const EVALUATING_AUDIENCES_COMBINED = 'Evaluating audiences for %s "%s": %s.';
export const AUDIENCE_EVALUATION_RESULT = '%s: Audience "%s" evaluated to %s.';
export const AUDIENCE_EVALUATION_RESULT_COMBINED = 'Audiences for %s %s collectively evaluated to %s.';
export const MISSING_ATTRIBUTE_VALUE =
  '%s: Audience condition %s evaluated to UNKNOWN because no value was passed for user attribute "%s".';
export const UNEXPECTED_CONDITION_VALUE =
  '%s: Audience condition %s evaluated to UNKNOWN because the condition value is not supported.';
export const UNEXPECTED_TYPE =
  '%s: Audience condition %s evaluated to UNKNOWN because a value of type "%s" was passed for user attribute "%s".';
export const UNEXPECTED_TYPE_NULL =
  '%s: Audience condition %s evaluated to UNKNOWN because a null value was passed for user attribute "%s".';
export const UPDATED_OPTIMIZELY_CONFIG = 'Updated Optimizely config to revision %s (project id %s)';
export const OUT_OF_BOUNDS =
  '%s: Audience condition %s evaluated to UNKNOWN because the number value for user attribute "%s" is not in the range [-2^53, +2^53].';
export const UNABLE_TO_ATTACH_UNLOAD = '%s: unable to bind optimizely.close() to page unload event: "%s"';
export const UNABLE_TO_PARSE_AND_SKIPPED_HEADER = 'Unable to parse & skipped header item';
export const ADDING_AUTHORIZATION_HEADER_WITH_BEARER_TOKEN = 'Adding Authorization header with Bearer Token';
export const MAKING_DATAFILE_REQ_TO_URL_WITH_HEADERS = 'Making datafile request to url %s with headers: %s';
export const RESPONSE_STATUS_CODE = 'Response status code: %s';
export const SAVED_LAST_MODIFIED_HEADER_VALUE_FROM_RESPONSE  = 'Saved last modified header value from response: %s'; 

export const messages: string[] = [];
