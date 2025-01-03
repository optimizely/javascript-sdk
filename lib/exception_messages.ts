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

export const FAILED_TO_DISPATCH_EVENTS = 'Failed to dispatch events'
export const FAILED_TO_DISPATCH_EVENTS_WITH_ARG = 'Failed to dispatch events: %s';
export const EVENT_PROCESSOR_STOPPED = 'Event processor stopped before it could be started';
export const SERVICE_STOPPED_BEFORE_IT_WAS_STARTED = 'Service stopped before it was started';
export const ONLY_POST_REQUESTS_ARE_SUPPORTED = 'Only POST requests are supported';
export const SEND_BEACON_FAILED = 'sendBeacon failed';
export const CANNOT_START_WITHOUT_ODP_CONFIG = 'cannot start without ODP config';
export const START_CALLED_WHEN_ODP_IS_NOT_INTEGRATED = 'start() called when ODP is not integrated';
export const ODP_ACTION_IS_NOT_VALID = 'ODP action is not valid (cannot be empty).';
export const ODP_MANAGER_STOPPED_BEFORE_RUNNING = 'odp manager stopped before running';
export const ODP_EVENT_MANAGER_STOPPED = "ODP event manager stopped before it could start";
export const ONREADY_TIMEOUT_EXPIRED = 'onReady timeout expired after %s ms';
export const INSTANCE_CLOSED = 'Instance closed';
export const DATAFILE_MANAGER_STOPPED = 'Datafile manager stopped before it could be started';
export const DATAFILE_MANAGER_FAILED_TO_START = 'Datafile manager failed to start';
export const FAILED_TO_FETCH_DATAFILE = 'Failed to fetch datafile';
export const FAILED_TO_STOP = 'Failed to stop';
export const YOU_MUST_PROVIDE_DATAFILE_IN_SSR = 'You must provide datafile in SSR';
export const YOU_MUST_PROVIDE_AT_LEAST_ONE_OF_SDKKEY_OR_DATAFILE = 'You must provide at least one of sdkKey or datafile';
export const RETRY_CANCELLED = 'Retry cancelled';
export const REQUEST_TIMEOUT = 'Request timeout';
export const REQUEST_ERROR = 'Request error';
export const REQUEST_FAILED = 'Request failed';
export const UNSUPPORTED_PROTOCOL = 'Unsupported protocol: %s';
export const NO_STATUS_CODE_IN_RESPONSE = 'No status code in response';
export const PROMISE_SHOULD_NOT_HAVE_RESOLVED = 'Promise should not have resolved';
export const VUID_IS_NOT_SUPPORTED_IN_NODEJS= 'VUID is not supported in Node.js environment';
