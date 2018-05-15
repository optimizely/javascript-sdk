/**
 * Copyright 2016-2017, Optimizely
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
var Optimizely = require('./optimizely');
var { PollingConfigCache } = require('./utils/config_cache');
var { ClientCache } = require('./utils/client_cache');

/**
 * Entry point into the Optimizely Node testing SDK
 */
module.exports = {
  createInstance: Optimizely.createInstance,

  PollingConfigCache: PollingConfigCache(browserRequester),
  ClientCache,
};

/**
 * The function that PollingConfigCache should use by default to update a config.
 */
async function browserRequester(url, headers) {
  // Currently broken, see https://optimizely.atlassian.net/browse/E2-3008
  const response = await window.fetch(url, { headers, mode: 'cors' });

  return {
    body: await response.text(),
    headers: Array.from(response.headers.entries()).reduce((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {}),
  };
}

