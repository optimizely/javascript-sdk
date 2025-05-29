
/**
 * Copyright 2025, Optimizely
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
export const INVALID_STORE = 'Invalid store';
export const INVALID_STORE_METHOD = 'Invalid store method %s';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const validateStore = (store: any): void => {
  const errors = [];
  if (!store || typeof store !== 'object') {
    throw new Error(INVALID_STORE);
  }

  for (const method of ['set', 'get', 'remove', 'getKeys']) {
    if (typeof store[method] !== 'function') {
      errors.push(INVALID_STORE_METHOD.replace('%s', method));
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
}
