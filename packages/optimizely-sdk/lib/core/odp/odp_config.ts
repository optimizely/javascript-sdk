/**
 * Copyright 2022-2023, Optimizely
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

import { checkArrayEquality } from '../../../lib/utils/fns';

export class OdpConfig {
  /**
   * Host of ODP audience segments API.
   * @private
   */
  private _apiHost: string;

  /**
   * Getter to retrieve the ODP server host
   * @public
   */
  get apiHost(): string {
    return this._apiHost;
  }

  /**
   * Public API key for the ODP account from which the audience segments will be fetched (optional).
   * @private
   */
  private _apiKey: string;

  /**
   * Getter to retrieve the ODP API key
   * @public
   */
  get apiKey(): string {
    return this._apiKey;
  }

  /**
   * All ODP segments used in the current datafile (associated with apiHost/apiKey).
   * @private
   */
  private _segmentsToCheck: string[];

  /**
   * Getter for ODP segments to check
   * @public
   */
  get segmentsToCheck(): string[] {
    return this._segmentsToCheck;
  }

  constructor(apiKey?: string, apiHost?: string, segmentsToCheck?: string[]) {
    this._apiKey = apiKey ?? '';
    this._apiHost = apiHost ?? '';
    this._segmentsToCheck = segmentsToCheck ?? [];
  }

  /**
   * Update the ODP configuration details
   * @param {OdpConfig} config New ODP Config to potentially update self with
   * @returns true if configuration was updated successfully
   */
  update(config: OdpConfig): boolean {
    if (this.equals(config)) {
      return false;
    } else {
      if (config.apiKey) this._apiKey = config.apiKey;
      if (config.apiHost) this._apiHost = config.apiHost;
      if (config.segmentsToCheck) this._segmentsToCheck = config.segmentsToCheck;

      return true;
    }
  }

  /**
   * Determines if ODP configuration has the minimum amount of information
   */
  isReady(): boolean {
    return !!this._apiKey && !!this._apiHost;
  }

  /**
   * Detects if there are any changes between the current and incoming ODP Configs
   * @param configToCompare ODP Configuration to check self against for equality
   * @returns Boolean based on if the current ODP Config is equivalent to the incoming ODP Config
   */
  equals(configToCompare: OdpConfig): boolean {
    return (
      this._apiHost === configToCompare._apiHost &&
      this._apiKey === configToCompare._apiKey &&
      checkArrayEquality(this.segmentsToCheck, configToCompare._segmentsToCheck)
    );
  }
}
