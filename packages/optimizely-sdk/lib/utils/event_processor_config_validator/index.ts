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
import { isSafeInteger } from '../fns';

/**
 * Return true if the argument is a valid event batch size, false otherwise
 * @param {unknown}   eventBatchSize
 * @returns {boolean}
 */
export function validateEventBatchSize(eventBatchSize: unknown): boolean {
  if (typeof eventBatchSize === 'number' && isSafeInteger(eventBatchSize)) {
    return eventBatchSize >= 1;
  }
  return false;
}

/**
 * Return true if the argument is a valid event flush interval, false otherwise
 * @param {unknown}   eventFlushInterval
 * @returns {boolean}
 */
export function validateEventFlushInterval(eventFlushInterval: unknown): boolean {
  if (typeof eventFlushInterval === 'number' && isSafeInteger(eventFlushInterval)) {
    return eventFlushInterval > 0;
  }
  return false;
}
