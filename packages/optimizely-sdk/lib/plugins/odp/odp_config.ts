/**
 * Copyright 2022, Optimizely
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

import { ODP_CONFIG_STATE } from '../../utils/enums';

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
  public get apiHost(): string {
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
  public get apiKey(): string {
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
  public get segmentsToCheck(): string[] {
    return this._segmentsToCheck;
  }

  /**
   * Indicates whether ODP is integrated for the project
   * @private
   */
  private _odpServiceIntegrated = ODP_CONFIG_STATE.UNDETERMINED;

  constructor(apiKey: string, apiHost: string, segmentsToCheck?: string[]) {
    this._apiKey = apiKey;
    this._apiHost = apiHost;
    this._segmentsToCheck = segmentsToCheck ?? [];
    this._odpServiceIntegrated = OdpConfig.determineOdpServiceIntegration(this._apiKey, this.apiHost);
  }

  /**
   * Determine the value of Service Integration enum
   * @param apiKey ODP API Key
   * @param apiHost Server host of the API
   * @private
   */
  private static determineOdpServiceIntegration(apiKey: string, apiHost: string): ODP_CONFIG_STATE {
    return apiKey && apiHost ? ODP_CONFIG_STATE.INTEGRATED : ODP_CONFIG_STATE.NOT_INTEGRATED;
  }

  /**
   * Update the ODP configuration details
   * @param apiKey Public API key for the ODP account
   * @param apiHost Host of ODP audience segments API
   * @param segmentsToCheck Audience segments
   * @returns true if configuration was updated successfully
   */
  public update(apiKey: string, apiHost: string, segmentsToCheck: string[]): boolean {
    this._odpServiceIntegrated = OdpConfig.determineOdpServiceIntegration(apiKey, apiHost);

    if (this._apiKey === apiKey && this._apiHost === apiHost && this._segmentsToCheck === segmentsToCheck) {
      return false;
    } else {
      this._apiKey = apiKey;
      this._apiHost = apiHost;
      this._segmentsToCheck = segmentsToCheck;

      return true;
    }
  }

  /**
   * Determines if ODP configuration has the minimum amount of information
   */
  public isReady(): boolean {
    return !!this._apiKey && !!this._apiHost;
  }
}
