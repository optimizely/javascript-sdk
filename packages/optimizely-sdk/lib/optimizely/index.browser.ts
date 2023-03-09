/****************************************************************************
 * Copyright 2023, Optimizely, Inc. and contributors                        *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    https://www.apache.org/licenses/LICENSE-2.0                           *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/

import OptimizelyUserContext from '../optimizely_user_context';
import Optimizely from '.';
import { OptimizelyOptions, UserAttributes } from '../shared_types';
import { BrowserOdpManager } from '../plugins/odp_manager/index.browser';

export default class BrowserOptimizely extends Optimizely {
  constructor(config: OptimizelyOptions) {
    super(config);
  }

  /**
   * @override
   * Creates a context of the user for which decision APIs will be called.
   *
   * A user context will be created successfully even when the SDK is not fully configured yet, however,
   * for just the browser variant ODP Manager is expected to have been instantiated already in order to
   * access the stored vuid.
   *
   * @param  {string}          userId      (Optional) The user ID to be used for bucketing. Defaults to VUID.
   * @param  {UserAttributes}  attributes  (Optional) Arbitrary attributes map.
   * @return {OptimizelyUserContext|null}  An OptimizelyUserContext associated with this OptimizelyClient or
   *                                       null if provided inputs are invalid
   */
  createUserContext(userId?: string, attributes?: UserAttributes): OptimizelyUserContext | null {
    const userIdentifier = userId || this.getVuid();

    if (!userIdentifier) {
      return null;
    }

    return super.createUserContext(userIdentifier, attributes);
  }

  /**
   * @returns {string|undefined}    Currently provisioned VUID from local ODP Manager or undefined if
   *                                ODP Manager has not been instantiated yet for any reason.
   */
  getVuid(): string | undefined {
    if (!this.odpManager) {
      this.logger?.error('Unable to get VUID - ODP Manager is not instantiated yet.');
      return undefined;
    }

    return (this.odpManager as BrowserOdpManager).vuid;
  }
}
