/**
 * Copyright 2022-2024, Optimizely
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

import { checkArrayEquality } from '../../utils/fns';

export type NoOdpIntegrationConfig = {
  readonly integrated: false;
}

export type OdpIntegrationConfig = {
  readonly integrated: true;
  readonly apiHost: string;
  readonly apiKey: string;
  readonly pixelUrl?: string;
  readonly segmentsToCheck?: string[];
}

export type OdpConfig = (NoOdpIntegrationConfig | OdpIntegrationConfig) & {
  equals(odpConfig: OdpConfig): boolean;
}

function areOdpConfigsEqual(config1: OdpConfig, config2: OdpConfig): boolean {
  if (config1.integrated !== config2.integrated) {
    return false;
  }
  if (config1.integrated && config2.integrated) {
    return (
      config1.apiHost === config2.apiHost &&
      config1.apiKey === config2.apiKey &&
      config1.pixelUrl === config2.pixelUrl &&
      checkArrayEquality(config1.segmentsToCheck || [], config2.segmentsToCheck || [])
    );
  }
  return true;
}

export function createOdpIntegrationConfig(
  apiHost: string,
  apiKey: string,
  pixelUrl?: string,
  segmentsToCheck?: string[]
): OdpConfig {
  return {
    integrated: true,
    apiHost,
    apiKey,
    pixelUrl,
    segmentsToCheck,
    equals: function(odpConfig: OdpConfig) {
      return areOdpConfigsEqual(this, odpConfig)
    }
  };
}

export function createNoOdpIntegrationConfig(): OdpConfig {
  return {
    integrated: false,
    equals: function (odpConfig: OdpConfig) {
      return areOdpConfigsEqual(this, odpConfig)
    }
  };
}

// export class OdpConfig {
//   /**
//    * Host of ODP audience segments API.
//    * @private
//    */
//   private _apiHost: string;

//   /**
//    * Getter to retrieve the ODP server host
//    * @public
//    */
//   get apiHost(): string {
//     return this._apiHost;
//   }

//   /**
//    * Public API key for the ODP account from which the audience segments will be fetched (optional).
//    * @private
//    */
//   private _apiKey: string;

//   /**
//    * Getter to retrieve the ODP API key
//    * @public
//    */
//   get apiKey(): string {
//     return this._apiKey;
//   }

//   /**
//    * Url for sending events via pixel.
//    * @private
//    */
//   private _pixelUrl: string;

//   /**
//    * Getter to retrieve the ODP pixel URL
//    * @public
//    */
//   get pixelUrl(): string {
//     return this._pixelUrl;
//   }

//   /**
//    * All ODP segments used in the current datafile (associated with apiHost/apiKey).
//    * @private
//    */
//   private _segmentsToCheck: string[];

//   /**
//    * Getter for ODP segments to check
//    * @public
//    */
//   get segmentsToCheck(): string[] {
//     return this._segmentsToCheck;
//   }

//   constructor(apiKey?: string, apiHost?: string, pixelUrl?: string, segmentsToCheck?: string[]) {
//     this._apiKey = apiKey ?? '';
//     this._apiHost = apiHost ?? '';
//     this._pixelUrl = pixelUrl ?? '';
//     this._segmentsToCheck = segmentsToCheck ?? [];
//   }

//   /**
//    * Update the ODP configuration details
//    * @param {OdpConfig} config New ODP Config to potentially update self with
//    * @returns true if configuration was updated successfully
//    */
//   update(config: OdpConfig): boolean {
//     if (this.equals(config)) {
//       return false;
//     } else {
//       if (config.apiKey) this._apiKey = config.apiKey;
//       if (config.apiHost) this._apiHost = config.apiHost;
//       if (config.pixelUrl) this._pixelUrl = config.pixelUrl;
//       if (config.segmentsToCheck) this._segmentsToCheck = config.segmentsToCheck;

//       return true;
//     }
//   }

//   /**
//    * Determines if ODP configuration has the minimum amount of information
//    */
//   isReady(): boolean {
//     return !!this._apiKey && !!this._apiHost;
//   }

//   /**
//    * Detects if there are any changes between the current and incoming ODP Configs
//    * @param configToCompare ODP Configuration to check self against for equality
//    * @returns Boolean based on if the current ODP Config is equivalent to the incoming ODP Config
//    */
//   equals(configToCompare: OdpConfig): boolean {
//     return (
//       this._apiHost === configToCompare._apiHost &&
//       this._apiKey === configToCompare._apiKey &&
//       this._pixelUrl === configToCompare._pixelUrl &&
//       checkArrayEquality(this.segmentsToCheck, configToCompare._segmentsToCheck)
//     );
//   }
// }
