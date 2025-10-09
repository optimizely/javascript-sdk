export const BUCKETING_ID_NOT_STRING = '0';
export const CMAB_FETCH_FAILED = '1';
export const CONDITION_EVALUATOR_ERROR = '2';
export const DATAFILE_FETCH_REQUEST_FAILED = '3';
export const ERROR_FETCHING_DATAFILE = '4';
export const EVENT_ACTION_INVALID = '5';
export const EVENT_DATA_INVALID = '6';
export const EVENT_KEY_NOT_FOUND = '7';
export const EXPERIMENT_KEY_NOT_IN_DATAFILE = '8';
export const FAILED_TO_DISPATCH_EVENTS = '9';
export const FAILED_TO_SEND_ODP_EVENTS = '10';
export const FEATURE_NOT_IN_DATAFILE = '11';
export const INVALID_ATTRIBUTES = '12';
export const INVALID_BUCKETING_ID = '13';
export const INVALID_CMAB_FETCH_RESPONSE = '14';
export const INVALID_CONFIG = '15';
export const INVALID_DATAFILE = '16';
export const INVALID_DATAFILE_MALFORMED = '17';
export const INVALID_DATAFILE_VERSION = '18';
export const INVALID_EVENT_TAGS = '19';
export const INVALID_EXPERIMENT_ID = '20';
export const INVALID_EXPERIMENT_KEY = '21';
export const INVALID_GROUP_ID = '22';
export const INVALID_INPUT_FORMAT = '23';
export const INVALID_JSON = '24';
export const INVALID_USER_ID = '25';
export const INVALID_USER_PROFILE_SERVICE = '26';
export const INVALID_VARIATION_KEY = '27';
export const MISSING_INTEGRATION_KEY = '28';
export const NOTIFICATION_LISTENER_EXCEPTION = '29';
export const NOT_TRACKING_USER = '30';
export const NO_DATAFILE_SPECIFIED = '31';
export const NO_EVENT_PROCESSOR = '32';
export const NO_JSON_PROVIDED = '33';
export const NO_PROJECT_CONFIG_FAILURE = '34';
export const NO_STATUS_CODE_IN_RESPONSE = '35';
export const NO_VARIATION_FOR_EXPERIMENT_KEY = '36';
export const ODP_CONFIG_NOT_AVAILABLE = '37';
export const ODP_EVENTS_SHOULD_HAVE_ATLEAST_ONE_KEY_VALUE = '38';
export const ODP_EVENT_FAILED = '39';
export const ODP_EVENT_FAILED_ODP_MANAGER_MISSING = '40';
export const ODP_EVENT_MANAGER_STOPPED = '41';
export const ODP_NOT_INTEGRATED = '42';
export const ONLY_POST_REQUESTS_ARE_SUPPORTED = '43';
export const OUT_OF_BOUNDS = '44';
export const PROMISE_NOT_ALLOWED = '45';
export const REQUEST_ERROR = '46';
export const REQUEST_TIMEOUT = '47';
export const RETRY_CANCELLED = '48';
export const SEND_BEACON_FAILED = '49';
export const SERVICE_NOT_RUNNING = '50';
export const UNABLE_TO_ATTACH_UNLOAD = '51';
export const UNABLE_TO_CAST_VALUE = '52';
export const UNABLE_TO_GET_VUID_VUID_MANAGER_NOT_AVAILABLE = '53';
export const UNABLE_TO_PARSE_AND_SKIPPED_HEADER = '54';
export const UNDEFINED_ATTRIBUTE = '55';
export const UNEXPECTED_CONDITION_VALUE = '56';
export const UNEXPECTED_RESERVED_ATTRIBUTE_PREFIX = '57';
export const UNEXPECTED_TYPE = '58';
export const UNKNOWN_CONDITION_TYPE = '59';
export const UNKNOWN_MATCH_TYPE = '60';
export const UNRECOGNIZED_ATTRIBUTE = '61';
export const UNRECOGNIZED_DECIDE_OPTION = '62';
export const UNSUPPORTED_PROTOCOL = '63';
export const USER_NOT_IN_FORCED_VARIATION = '64';
export const USER_PROFILE_LOOKUP_ERROR = '65';
export const USER_PROFILE_SAVE_ERROR = '66';
export const VARIABLE_KEY_NOT_IN_DATAFILE = '67';
export const VARIABLE_REQUESTED_WITH_WRONG_TYPE = '68';
export const VARIATION_ID_NOT_IN_DATAFILE = '69';
export const messages = [
  "BucketingID attribute is not a string. Defaulted to userId",
  "CMAB decision fetch failed with status: %s",
  "Error evaluating audience condition of type %s: %s",
  "Datafile fetch request failed with status: %s",
  "Error fetching datafile: %s",
  "Event action invalid.",
  "Event data invalid.",
  "Event key %s is not in datafile.",
  "Experiment key %s is not in datafile.",
  "Failed to dispatch events, status: %s",
  "failed to send odp events",
  "Feature key %s is not in datafile.",
  "Provided attributes are in an invalid format.",
  "Unable to generate hash for bucketing ID %s: %s",
  "Invalid CMAB fetch response",
  "Provided Optimizely config is in an invalid format.",
  "Datafile is invalid - property %s: %s",
  "Datafile is invalid because it is malformed.",
  "This version of the JavaScript SDK does not support the given datafile version: %s",
  "Provided event tags are in an invalid format.",
  "Experiment ID %s is not in datafile.",
  "Experiment key %s is not in datafile. It is either invalid, paused, or archived.",
  "Group ID %s is not in datafile.",
  "Provided %s is in an invalid format.",
  "JSON object is not valid.",
  "Provided user ID is in an invalid format.",
  "Provided user profile service instance is in an invalid format: %s.",
  "Provided variation key is in an invalid format.",
  "Integration key missing from datafile. All integrations should include a key.",
  "Notification listener for (%s) threw exception: %s",
  "Not tracking user %s.",
  "No datafile specified. Cannot start optimizely.",
  "No event processor is provided",
  "No JSON object to validate against schema.",
  "No project config available. Failing %s.",
  "No status code in response",
  "No variation key %s defined in datafile for experiment %s.",
  "ODP config is not available.",
  "ODP events should have at least one key-value pair in identifiers.",
  "ODP event send failed.",
  "ODP Event failed to send. (ODP Manager not available).",
  "ODP event manager stopped before it could start",
  "ODP is not integrated",
  "Only POST requests are supported",
  "Audience condition %s evaluated to UNKNOWN because the number value for user attribute \"%s\" is not in the range [-2^53, +2^53].",
  "Promise value is not allowed in sync operation",
  "Request error",
  "Request timeout",
  "Retry cancelled",
  "sendBeacon failed",
  "%s not running",
  "unable to bind optimizely.close() to page unload event: \"%s\"",
  "Unable to cast value %s to type %s, returning null.",
  "Unable to get VUID - VuidManager is not available",
  "Unable to parse & skipped header item",
  "Provided attribute: %s has an undefined value.",
  "Audience condition %s evaluated to UNKNOWN because the condition value is not supported.",
  "Attribute %s unexpectedly has reserved prefix %s; using attribute ID instead of reserved attribute name.",
  "Audience condition %s evaluated to UNKNOWN because a value of type \"%s\" was passed for user attribute \"%s\".",
  "Audience condition %s has an unknown condition type. You may need to upgrade to a newer release of the Optimizely SDK.",
  "Audience condition %s uses an unknown match type. You may need to upgrade to a newer release of the Optimizely SDK.",
  "Unrecognized attribute %s provided. Pruning before sending event to Optimizely.",
  "Unrecognized decide option %s provided.",
  "Unsupported protocol: %s",
  "User %s is not in the forced variation map. Cannot remove their forced variation.",
  "Error while looking up user profile for user ID \"%s\": %s.",
  "Error while saving user profile for user ID \"%s\": %s.",
  "Variable with key \"%s\" associated with feature with key \"%s\" is not in datafile.",
  "Requested variable type \"%s\", but variable is of type \"%s\". Use correct API to retrieve value. Returning None.",
  "Variation ID %s is not in the datafile."
];