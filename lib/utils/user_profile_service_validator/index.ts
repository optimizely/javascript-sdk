/****************************************************************************
 * Copyright 2017, 2020, 2022, Optimizely, Inc. and contributors                  *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/

/**
 * Provides utility method for validating that the given user profile service implementation is valid.
 */

import { ObjectWithUnknownProperties } from '../../shared_types';
import { INVALID_USER_PROFILE_SERVICE } from 'error_message';

import { OptimizelyError } from '../../error/optimizly_error';

/**
 * Validates user's provided user profile service instance
 * @param  {unknown}  userProfileServiceInstance
 * @return {boolean} true if the instance is valid
 * @throws If the instance is not valid
 */

export function validate(userProfileServiceInstance: unknown): boolean {
  if (typeof userProfileServiceInstance === 'object' && userProfileServiceInstance !== null) {
    if (typeof (userProfileServiceInstance as ObjectWithUnknownProperties)['lookup'] !== 'function') {
      throw new OptimizelyError(INVALID_USER_PROFILE_SERVICE, "Missing function 'lookup'");
    } else if (typeof (userProfileServiceInstance as ObjectWithUnknownProperties)['save'] !== 'function') {
      throw new OptimizelyError(INVALID_USER_PROFILE_SERVICE, "Missing function 'save'");
    }
    return true;
  }
  throw new OptimizelyError(INVALID_USER_PROFILE_SERVICE, 'Not an object');
}
