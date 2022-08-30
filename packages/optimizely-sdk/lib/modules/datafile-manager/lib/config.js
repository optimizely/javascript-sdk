"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_TIMEOUT_MS = exports.BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT = exports.DEFAULT_AUTHENTICATED_URL_TEMPLATE = exports.DEFAULT_URL_TEMPLATE = exports.MIN_UPDATE_INTERVAL = exports.DEFAULT_UPDATE_INTERVAL = void 0;
exports.DEFAULT_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
exports.MIN_UPDATE_INTERVAL = 1000;
exports.DEFAULT_URL_TEMPLATE = "https://cdn.optimizely.com/datafiles/%s.json";
exports.DEFAULT_AUTHENTICATED_URL_TEMPLATE = "https://config.optimizely.com/datafiles/auth/%s.json";
exports.BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT = [0, 8, 16, 32, 64, 128, 256, 512];
exports.REQUEST_TIMEOUT_MS = 60 * 1000; // 1 minute
