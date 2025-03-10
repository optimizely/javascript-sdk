/**
 * Copyright 2017, 2020, 2022 Optimizely
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

/**
 * Provides utility method for validating that event tags user has provided are valid
 */
import { OptimizelyError } from '../../error/optimizly_error';
import { INVALID_EVENT_TAGS } from 'error_message';

/**
 * Validates user's provided event tags
 * @param  {unknown}  eventTags
 * @return {boolean} true if event tags are valid
 * @throws If event tags are not valid
 */
export function validate(eventTags: unknown): boolean {
  if (typeof eventTags === 'object' && !Array.isArray(eventTags) && eventTags !== null) {
    return true;
  } else {
    throw new OptimizelyError(INVALID_EVENT_TAGS);
  }
}
