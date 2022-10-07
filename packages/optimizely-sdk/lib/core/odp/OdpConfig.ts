/**
 * Copyright 2022, Optimizely
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

export enum OdpConfigState {
  UNDETERMINED,
  INTEGRATED,
  NOT_INTEGRATED,
}

export class OdpConfig {
  private _apiHost?: string;
  private _apiKey?: string;
  private _segmentsToCheck?: Array<string>;
  private _odpState: OdpConfigState = OdpConfigState.UNDETERMINED;

  /**
   * Creates configuration used for ODP integration.
   * @param apiHost The host URL for the ODP audience segments API (optional).
   * @param apiKey The public API key for the ODP account from which the audience segments will be fetched (optional).
   * @param segmentsToCheck A list of all ODP segments used in the current datafile (associated with apiHost/apiKey) (optional).
   */
  constructor(apiHost?: string, apiKey?: string, segmentsToCheck?: Array<string>) {
    this.update(apiHost, apiKey, segmentsToCheck);
  }

  /**
   * Updates the values of the ODP configuration.
   * @param apiHost The host URL for the ODP audience segments API (optional).
   * @param apiKey The public API key for the ODP account from which the audience segments will be fetched (optional).
   * @param segmentsToCheck A list of all ODP segments used in the current datafile (associated with apiHost/apiKey) (optional).
   * @returns Boolean that represents if the ODP configuration values were changed based on the input parameters.
   */
  update(apiHost?: string, apiKey?: string, segmentsToCheck?: Array<string>): boolean {
    if (this._apiHost == apiHost && this._apiKey == apiKey && this._segmentsToCheck?.join() == segmentsToCheck?.join())
      return false;

    this._apiHost = apiHost;
    this._apiKey = apiKey;
    this._segmentsToCheck = segmentsToCheck;
    this._odpState = this._apiHost && this._apiKey ? OdpConfigState.INTEGRATED : OdpConfigState.UNDETERMINED;

    return true;
  }

  get apiHost(): string | undefined {
    return this._apiHost;
  }

  get apiKey(): string | undefined {
    return this._apiKey;
  }

  get segmentsToCheck(): Array<string> | undefined {
    return this._segmentsToCheck;
  }

  get odpState(): OdpConfigState {
    return this._odpState;
  }
}
