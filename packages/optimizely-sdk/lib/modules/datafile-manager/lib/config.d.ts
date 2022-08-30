/**
 * Copyright 2019-2020, Optimizely
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
export declare const DEFAULT_UPDATE_INTERVAL: number;
export declare const MIN_UPDATE_INTERVAL = 1000;
export declare const DEFAULT_URL_TEMPLATE = "https://cdn.optimizely.com/datafiles/%s.json";
export declare const DEFAULT_AUTHENTICATED_URL_TEMPLATE = "https://config.optimizely.com/datafiles/auth/%s.json";
export declare const BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT: number[];
export declare const REQUEST_TIMEOUT_MS: number;
