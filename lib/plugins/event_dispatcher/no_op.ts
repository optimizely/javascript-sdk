/**
 * Copyright 2021, 2024, Optimizely
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

import { Event } from '../../shared_types';

/**
 * No Op Event dispatcher for non standard platforms like edge workers etc
 * @param  {Event}    eventObj
 * @param  {Function} callback
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
export const dispatchEvent = function(
  eventObj: Event,
): any {
  // NoOp Event dispatcher. It does nothing really.
}

export default {
  dispatchEvent,
};
