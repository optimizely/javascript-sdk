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
export const NOTIFICATION_LISTENER_EXCEPTION = 'Notification listener for (%s) threw exception: %s';
export const BROWSER_ODP_MANAGER_INITIALIZATION_FAILED = '%s: Error initializing Browser ODP Manager.';
export const CONDITION_EVALUATOR_ERROR = 'Error evaluating audience condition of type %s: %s';
export const DATAFILE_AND_SDK_KEY_MISSING =
  '%s: You must provide at least one of sdkKey or datafile. Cannot start Optimizely';
export const EXPERIMENT_KEY_NOT_IN_DATAFILE = 'Experiment key %s is not in datafile.';
export const FEATURE_NOT_IN_DATAFILE = 'Feature key %s is not in datafile.';
export const FETCH_SEGMENTS_FAILED_NETWORK_ERROR = '%s: Audience segments fetch failed. (network error)';
export const FETCH_SEGMENTS_FAILED_DECODE_ERROR = '%s: Audience segments fetch failed. (decode error)';
export const INVALID_ATTRIBUTES = 'Provided attributes are in an invalid format.';
export const INVALID_BUCKETING_ID = 'Unable to generate hash for bucketing ID %s: %s';
export const INVALID_DATAFILE = 'Datafile is invalid - property %s: %s';
export const INVALID_DATAFILE_MALFORMED = 'Datafile is invalid because it is malformed.';
export const INVALID_CONFIG = 'Provided Optimizely config is in an invalid format.';
export const INVALID_JSON = 'JSON object is not valid.';
export const INVALID_ERROR_HANDLER = 'Provided "errorHandler" is in an invalid format.';
export const INVALID_EVENT_DISPATCHER = 'Provided "eventDispatcher" is in an invalid format.';
export const INVALID_EVENT_TAGS = 'Provided event tags are in an invalid format.';
export const INVALID_EXPERIMENT_KEY =
  'Experiment key %s is not in datafile. It is either invalid, paused, or archived.';
export const INVALID_EXPERIMENT_ID = 'Experiment ID %s is not in datafile.';
export const INVALID_GROUP_ID = 'Group ID %s is not in datafile.';
export const INVALID_LOGGER = 'Provided "logger" is in an invalid format.';
export const INVALID_USER_ID = 'Provided user ID is in an invalid format.';
export const INVALID_USER_PROFILE_SERVICE = 'Provided user profile service instance is in an invalid format: %s.';
export const LOCAL_STORAGE_DOES_NOT_EXIST = 'Error accessing window localStorage.';
export const MISSING_INTEGRATION_KEY =
  'Integration key missing from datafile. All integrations should include a key.';
export const NO_DATAFILE_SPECIFIED = 'No datafile specified. Cannot start optimizely.';
export const NO_JSON_PROVIDED = 'No JSON object to validate against schema.';
export const NO_EVENT_PROCESSOR = 'No event processor is provided';
export const NO_VARIATION_FOR_EXPERIMENT_KEY = 'No variation key %s defined in datafile for experiment %s.';
export const ODP_CONFIG_NOT_AVAILABLE = '%s: ODP is not integrated to the project.';
export const ODP_EVENT_FAILED = 'ODP event send failed.';
export const ODP_EVENT_MANAGER_IS_NOT_RUNNING = 'ODP event manager is not running.';
export const ODP_EVENTS_SHOULD_HAVE_ATLEAST_ONE_KEY_VALUE = 'ODP events should have at least one key-value pair in identifiers.';
export const ODP_FETCH_QUALIFIED_SEGMENTS_SEGMENTS_MANAGER_MISSING =
  '%s: ODP unable to fetch qualified segments (Segments Manager not initialized).';
export const ODP_IDENTIFY_FAILED_EVENT_MANAGER_MISSING =
  '%s: ODP identify event %s is not dispatched (Event Manager not instantiated).';
export const ODP_INITIALIZATION_FAILED = '%s: ODP failed to initialize.';
export const ODP_INVALID_DATA = '%s: ODP data is not valid';
export const ODP_EVENT_FAILED_ODP_MANAGER_MISSING = '%s: ODP Event failed to send. (ODP Manager not initialized).';
export const ODP_FETCH_QUALIFIED_SEGMENTS_FAILED_ODP_MANAGER_MISSING =
  '%s: ODP failed to Fetch Qualified Segments. (ODP Manager not initialized).';
export const ODP_IDENTIFY_USER_FAILED_ODP_MANAGER_MISSING =
  '%s: ODP failed to Identify User. (ODP Manager not initialized).';
export const ODP_IDENTIFY_USER_FAILED_USER_CONTEXT_INITIALIZATION =
  '%s: ODP failed to Identify User. (Failed during User Context Initialization).';
export const ODP_MANAGER_UPDATE_SETTINGS_FAILED_EVENT_MANAGER_MISSING =
  '%s: ODP Manager failed to update OdpConfig settings for internal event manager. (Event Manager not initialized).';
export const ODP_MANAGER_UPDATE_SETTINGS_FAILED_SEGMENTS_MANAGER_MISSING =
  '%s: ODP Manager failed to update OdpConfig settings for internal segments manager. (Segments Manager not initialized).';
export const ODP_NOT_ENABLED = 'ODP is not enabled';
export const ODP_NOT_INTEGRATED = '%s: ODP is not integrated';
export const ODP_SEND_EVENT_FAILED_EVENT_MANAGER_MISSING =
  '%s: ODP send event %s was not dispatched (Event Manager not instantiated).';
export const ODP_SEND_EVENT_FAILED_UID_MISSING =
  '%s: ODP send event %s was not dispatched (No valid user identifier provided).';
export const ODP_SEND_EVENT_FAILED_VUID_MISSING = '%s: ODP send event %s was not dispatched (Unable to fetch VUID).';
export const ODP_VUID_INITIALIZATION_FAILED = '%s: ODP VUID initialization failed.';
export const ODP_VUID_REGISTRATION_FAILED = '%s: ODP VUID failed to be registered.';
export const ODP_VUID_REGISTRATION_FAILED_EVENT_MANAGER_MISSING =
  '%s: ODP register vuid failed. (Event Manager not instantiated).';
export const UNDEFINED_ATTRIBUTE = 'Provided attribute: %s has an undefined value.';
export const UNRECOGNIZED_ATTRIBUTE =
  'Unrecognized attribute %s provided. Pruning before sending event to Optimizely.';
export const UNABLE_TO_CAST_VALUE = 'Unable to cast value %s to type %s, returning null.';
export const USER_NOT_IN_FORCED_VARIATION =
  'User %s is not in the forced variation map. Cannot remove their forced variation.';
export const USER_PROFILE_LOOKUP_ERROR = 'Error while looking up user profile for user ID "%s": %s.';
export const USER_PROFILE_SAVE_ERROR = 'Error while saving user profile for user ID "%s": %s.';
export const VARIABLE_KEY_NOT_IN_DATAFILE =
  '%s: Variable with key "%s" associated with feature with key "%s" is not in datafile.';
export const VARIATION_ID_NOT_IN_DATAFILE = '%s: No variation ID %s defined in datafile for experiment %s.';
export const VARIATION_ID_NOT_IN_DATAFILE_NO_EXPERIMENT = 'Variation ID %s is not in the datafile.';
export const INVALID_INPUT_FORMAT = 'Provided %s is in an invalid format.';
export const INVALID_DATAFILE_VERSION =
  'This version of the JavaScript SDK does not support the given datafile version: %s';
export const INVALID_VARIATION_KEY = 'Provided variation key is in an invalid format.';
export const UNABLE_TO_GET_VUID = 'Unable to get VUID - ODP Manager is not instantiated yet.';
export const ERROR_FETCHING_DATAFILE = 'Error fetching datafile: %s';
export const DATAFILE_FETCH_REQUEST_FAILED = 'Datafile fetch request failed with status: %s';
export const EVENT_DATA_FOUND_TO_BE_INVALID = 'Event data found to be invalid.';
export const EVENT_ACTION_INVALID = 'Event action invalid.';
export const FAILED_TO_SEND_ODP_EVENTS = 'failed to send odp events';
export const UNABLE_TO_GET_VUID_VUID_MANAGER_NOT_AVAILABLE = 'Unable to get VUID - VuidManager is not available'
export const UNKNOWN_CONDITION_TYPE =
   'Audience condition %s has an unknown condition type. You may need to upgrade to a newer release of the Optimizely SDK.';
export const UNKNOWN_MATCH_TYPE =
  'Audience condition %s uses an unknown match type. You may need to upgrade to a newer release of the Optimizely SDK.';
export const UNRECOGNIZED_DECIDE_OPTION = 'Unrecognized decide option %s provided.';
export const INVALID_OBJECT = 'Optimizely object is not valid. Failing %s.';
export const EVENT_KEY_NOT_FOUND = 'Event key %s is not in datafile.';
export const NOT_TRACKING_USER = 'Not tracking user %s.';
export const VARIABLE_REQUESTED_WITH_WRONG_TYPE =
  'Requested variable type "%s", but variable is of type "%s". Use correct API to retrieve value. Returning None.';
export const UNEXPECTED_RESERVED_ATTRIBUTE_PREFIX =
  'Attribute %s unexpectedly has reserved prefix %s; using attribute ID instead of reserved attribute name.';
export const BUCKETING_ID_NOT_STRING = 'BucketingID attribute is not a string. Defaulted to userId';
export const UNEXPECTED_CONDITION_VALUE =
  'Audience condition %s evaluated to UNKNOWN because the condition value is not supported.';
export const UNEXPECTED_TYPE =
  'Audience condition %s evaluated to UNKNOWN because a value of type "%s" was passed for user attribute "%s".';
export const OUT_OF_BOUNDS =
  'Audience condition %s evaluated to UNKNOWN because the number value for user attribute "%s" is not in the range [-2^53, +2^53].';
export const REQUEST_TIMEOUT = 'Request timeout';
export const REQUEST_ERROR = 'Request error';
export const NO_STATUS_CODE_IN_RESPONSE = 'No status code in response';
export const UNSUPPORTED_PROTOCOL = 'Unsupported protocol: %s';
export const ONREADY_TIMEOUT = 'onReady timeout expired after %s ms';
export const INSTANCE_CLOSED = 'Instance closed';
export const DATAFILE_MANAGER_STOPPED = 'Datafile manager stopped before it could be started';
export const FAILED_TO_FETCH_DATAFILE = 'Failed to fetch datafile';
export const NO_SDKKEY_OR_DATAFILE = 'At least one of sdkKey or datafile must be provided';
export const RETRY_CANCELLED = 'Retry cancelled';
export const SERVICE_STOPPED_BEFORE_IT_WAS_STARTED = 'Service stopped before it was started';
export const ONLY_POST_REQUESTS_ARE_SUPPORTED = 'Only POST requests are supported';
export const SEND_BEACON_FAILED = 'sendBeacon failed';
export const FAILED_TO_DISPATCH_EVENTS = 'Failed to dispatch events'
export const FAILED_TO_DISPATCH_EVENTS_WITH_ARG = 'Failed to dispatch events: %s';
export const EVENT_PROCESSOR_STOPPED = 'Event processor stopped before it could be started';
export const CANNOT_START_WITHOUT_ODP_CONFIG = 'cannot start without ODP config';
export const START_CALLED_WHEN_ODP_IS_NOT_INTEGRATED = 'start() called when ODP is not integrated';
export const ODP_ACTION_IS_NOT_VALID = 'ODP action is not valid (cannot be empty).';
export const ODP_MANAGER_STOPPED_BEFORE_RUNNING = 'odp manager stopped before running';
export const ODP_EVENT_MANAGER_STOPPED = "ODP event manager stopped before it could start";
export const ONREADY_TIMEOUT_EXPIRED = 'onReady timeout expired after %s ms';
export const DATAFILE_MANAGER_FAILED_TO_START = 'Datafile manager failed to start';


export const messages: string[] = [];
