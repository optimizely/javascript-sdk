/**
 * Copyright 2019-2020 Optimizely
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
import fns from '../fns';

/**
 * Return true if the argument is a valid event batch size, false otherwise
 * @param {*} eventBatchSize
 * @returns boolean
 */
export var validateEventBatchSize = function(eventBatchSize) {
  return fns.isSafeInteger(eventBatchSize) && eventBatchSize >= 1;
}

/**
 * Return true if the argument is a valid event flush interval, false otherwise
 * @param {*} eventFlushInterval
 * @returns boolean
 */
export var validateEventFlushInterval = function(eventFlushInterval) {
  return fns.isSafeInteger(eventFlushInterval) && eventFlushInterval > 0;
}

export default {
  validateEventBatchSize: validateEventBatchSize,
  validateEventFlushInterval: validateEventFlushInterval,
}
