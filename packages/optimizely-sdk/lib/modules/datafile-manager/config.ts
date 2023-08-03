/**
 * Copyright 2022-2023, Optimizely
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

const DEFAULT_UPDATE_INTERVAL_MINUTES = 5;
/** Standard interval (5 minutes in milliseconds) for polling datafile updates.; */
export const DEFAULT_UPDATE_INTERVAL = DEFAULT_UPDATE_INTERVAL_MINUTES * 60 * 1000;

const MIN_UPDATE_INTERVAL_SECONDS = 30;
/** Minimum allowed interval (30 seconds in milliseconds) for polling datafile updates. */
export const MIN_UPDATE_INTERVAL = MIN_UPDATE_INTERVAL_SECONDS * 1000;

export const UPDATE_INTERVAL_BELOW_MINIMUM_MESSAGE = `Polling intervals below ${MIN_UPDATE_INTERVAL_SECONDS} seconds are not recommended.`;

export const DEFAULT_URL_TEMPLATE = `https://cdn.optimizely.com/datafiles/%s.json`;

export const DEFAULT_AUTHENTICATED_URL_TEMPLATE = `https://config.optimizely.com/datafiles/auth/%s.json`;

export const BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT = [0, 8, 16, 32, 64, 128, 256, 512];

export const REQUEST_TIMEOUT_MS = 60 * 1000; // 1 minute
