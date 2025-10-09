export const ADDING_AUTHORIZATION_HEADER_WITH_BEARER_TOKEN = '0';
export const AUDIENCE_EVALUATION_RESULT = '1';
export const EVALUATING_AUDIENCE = '2';
export const EVENT_STORE_FULL = '3';
export const FAILED_TO_PARSE_REVENUE = '4';
export const FAILED_TO_PARSE_VALUE = '5';
export const FEATURE_ENABLED_FOR_USER = '6';
export const FEATURE_NOT_ENABLED_FOR_USER = '7';
export const FEATURE_NOT_ENABLED_RETURN_DEFAULT_VARIABLE_VALUE = '8';
export const INVALID_CLIENT_ENGINE = '9';
export const INVALID_DECIDE_OPTIONS = '10';
export const INVALID_DEFAULT_DECIDE_OPTIONS = '11';
export const INVALID_EXPERIMENT_KEY_INFO = '12';
export const MAKING_DATAFILE_REQ_TO_URL_WITH_HEADERS = '13';
export const MISSING_ATTRIBUTE_VALUE = '14';
export const NOT_ACTIVATING_USER = '15';
export const PARSED_NUMERIC_VALUE = '16';
export const PARSED_REVENUE_VALUE = '17';
export const RESPONSE_STATUS_CODE = '18';
export const SAVED_LAST_MODIFIED_HEADER_VALUE_FROM_RESPONSE = '19';
export const SAVED_USER_VARIATION = '20';
export const SAVED_VARIATION_NOT_FOUND = '21';
export const SHOULD_NOT_DISPATCH_ACTIVATE = '22';
export const SKIPPING_JSON_VALIDATION = '23';
export const TRACK_EVENT = '24';
export const UNEXPECTED_TYPE_NULL = '25';
export const UPDATED_OPTIMIZELY_CONFIG = '26';
export const USER_HAS_NO_FORCED_VARIATION = '27';
export const USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT = '28';
export const USER_MAPPED_TO_FORCED_VARIATION = '29';
export const USER_RECEIVED_DEFAULT_VARIABLE_VALUE = '30';
export const USER_RECEIVED_VARIABLE_VALUE = '31';
export const VALID_BUCKETING_ID = '32';
export const VALID_DATAFILE = '33';
export const VALID_USER_PROFILE_SERVICE = '34';
export const VARIABLE_NOT_USED_RETURN_DEFAULT_VARIABLE_VALUE = '35';
export const VARIATION_REMOVED_FOR_USER = '36';
export const messages = [
  "Adding Authorization header with Bearer Token",
  "Audience \"%s\" evaluated to %s.",
  "Starting to evaluate audience \"%s\" with conditions: %s.",
  "Event store is full. Not saving event with id %d.",
  "Failed to parse revenue value \"%s\" from event tags.",
  "Failed to parse event value \"%s\" from event tags.",
  "Feature %s is enabled for user %s.",
  "Feature %s is not enabled for user %s.",
  "Feature \"%s\" is not enabled for user %s. Returning the default variable value \"%s\".",
  "Invalid client engine passed: %s. Defaulting to node-sdk.",
  "Provided decide options is not an array. Using default decide options.",
  "Provided default decide options is not an array.",
  "Experiment key %s is not in datafile. It is either invalid, paused, or archived.",
  "Making datafile request to url %s with headers: %s",
  "Audience condition %s evaluated to UNKNOWN because no value was passed for user attribute \"%s\".",
  "Not activating user %s for experiment %s.",
  "Parsed event value \"%s\" from event tags.",
  "Parsed revenue value \"%s\" from event tags.",
  "Response status code: %s",
  "Saved last modified header value from response: %s",
  "Saved user profile for user \"%s\".",
  "User %s was previously bucketed into variation with ID %s for experiment %s, but no matching variation was found.",
  "Experiment %s is not in \"Running\" state. Not activating user.",
  "Skipping JSON schema validation.",
  "Tracking event %s for user %s.",
  "Audience condition %s evaluated to UNKNOWN because a null value was passed for user attribute \"%s\".",
  "Updated Optimizely config to revision %s (project id %s)",
  "User %s is not in the forced variation map.",
  "No experiment %s mapped to user %s in the forced variation map.",
  "Set variation %s for experiment %s and user %s in the forced variation map.",
  "User \"%s\" is not in any variation or rollout rule. Returning default value for variable \"%s\" of feature flag \"%s\".",
  "Got variable value \"%s\" for variable \"%s\" of feature flag \"%s\"",
  "BucketingId is valid: \"%s\"",
  "Datafile is valid.",
  "Valid user profile service provided.",
  "Variable \"%s\" is not used in variation \"%s\". Returning default value.",
  "Variation mapped to experiment %s has been removed for user %s."
];