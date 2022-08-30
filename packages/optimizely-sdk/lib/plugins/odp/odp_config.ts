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


enum OdpConfigState {
  notDetermined = 0,
  integrated = 1,
  notIntegrated = 2,
}

class OdpConfig {
  /**
   * Fully-qualified URL for the ODP audience segments API (optional).
   * @private
   */
  private _apiHost?: string;

  /**
   * Public API key for the ODP account from which the audience segments will be fetched (optional).
   * @private
   */
  private _apiKey?: string;

  /**
   * All ODP segments used in the current datafile (associated with apiHost/apiKey).
   * @private
   */
  private _segmentsToCheck?: string[];

  /**
   * Indicates whether ODP is integrated for the project
   * @private
   */
  private _odpServiceIntegrated?: OdpConfigState;

  //let queue = DispatchQueue(label: "odpConfig");

  constructor(apiKey?: string, apiHost?: string, segmentsToCheck?: string[]) {
    this._apiKey = apiKey;
    this._apiHost = apiHost;
    this._segmentsToCheck = segmentsToCheck ?? [] as string[];
    this._odpServiceIntegrated = OdpConfigState.notDetermined;
  }

  public update(apiKey?: string, apiHost?: string, segmentsToCheck?: string[]): boolean {
    if (apiKey && apiHost) {
      this._odpServiceIntegrated = OdpConfigState.integrated;
    } else {
      this._odpServiceIntegrated = OdpConfigState.notIntegrated;
    }

    if (this._apiKey === apiKey && this._apiHost === apiHost && this._segmentsToCheck === segmentsToCheck) {
      return false;
    } else {
      this._apiKey = apiKey;
      this._apiHost = apiHost;
      this._segmentsToCheck = segmentsToCheck;

      return true;
    }
  }
}
