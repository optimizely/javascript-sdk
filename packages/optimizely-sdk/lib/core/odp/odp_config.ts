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

export class OdpConfig {
  /**
   * Host of ODP audience segments API.
   * @private
   */
  private _apiHost = '';

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
  private _apiKey = '';

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
  private _segmentsToCheck: Set<string>;

  /**
   * Getter for ODP segments to check
   * @public
   */
  public get segmentsToCheck(): Set<string> {
    return this._segmentsToCheck;
  }

  constructor(apiKey?: string, apiHost?: string, segmentsToCheck?: Set<string>) {
    if (apiKey) this._apiKey = apiKey;
    if (apiHost) this._apiHost = apiHost;
    this._segmentsToCheck = segmentsToCheck ?? new Set<string>('');
  }

  /**
   * Update the ODP configuration details
   * @param apiKey Public API key for the ODP account
   * @param apiHost Host of ODP audience segments API
   * @param segmentsToCheck Audience segments
   * @returns true if configuration was updated successfully
   */
  public update(apiKey?: string, apiHost?: string, segmentsToCheck?: Set<string>): boolean {
    if (this._apiKey === apiKey && this._apiHost === apiHost && this._segmentsToCheck === segmentsToCheck) {
      return false;
    } else {
      if (apiKey) this._apiKey = apiKey;
      if (apiHost) this._apiHost = apiHost;
      if (segmentsToCheck) this._segmentsToCheck = segmentsToCheck;

      return true;
    }
  }

  /**
   * Determines if ODP configuration has the minimum amount of information
   */
  public isReady(): boolean {
    return !!this._apiKey && !!this._apiHost;
  }

  /**
   * Detects if there are any changes between the current and incoming ODP Configs
   * @param config ODP Configuration
   * @returns Boolean based on if the current ODP Config is equivalent to the incoming ODP Config
   */
  public equals(config: OdpConfig): boolean {
    return (
      this._apiHost == config._apiHost &&
      this._apiKey == config._apiKey &&
      this.segmentsToCheck.size == config._segmentsToCheck.size &&
      this.checkSetEquality(this.segmentsToCheck, config._segmentsToCheck)
    );
  }

  private checkSetEquality(setA: Set<string>, setB: Set<string>) {
    let isEqual = true;
    setA.forEach(item => {
      if (!setB.has(item)) isEqual = false;
    });
    return isEqual;
  }
}
