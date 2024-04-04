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

export class OdpConfig {
  /**
   * Host of ODP audience segments API.
   */
  readonly apiHost: string;

  /**
   * Public API key for the ODP account from which the audience segments will be fetched (optional).
   */
  readonly apiKey: string;

  /**
   * Url for sending events via pixel.
   */
  readonly pixelUrl: string;

  /**
   * All ODP segments used in the current datafile (associated with apiHost/apiKey).
   */
  readonly segmentsToCheck: string[];

  constructor(apiKey: string, apiHost: string, pixelUrl: string, segmentsToCheck: string[]) {
    this.apiKey = apiKey;
    this.apiHost = apiHost;
    this.pixelUrl = pixelUrl;
    this.segmentsToCheck = segmentsToCheck;
  }

  /**
   * Detects if there are any changes between the current and incoming ODP Configs
   * @param configToCompare ODP Configuration to check self against for equality
   * @returns Boolean based on if the current ODP Config is equivalent to the incoming ODP Config
   */
  equals(configToCompare: OdpConfig): boolean {
    return (
      this.apiHost === configToCompare.apiHost &&
      this.apiKey === configToCompare.apiKey &&
      this.pixelUrl === configToCompare.pixelUrl &&
      checkArrayEquality(this.segmentsToCheck, configToCompare.segmentsToCheck)
    );
  }
}

export type OdpNotIntegratedConfig = {
  readonly integrated: false;
}

export type OdpIntegratedConfig = {
  readonly integrated: true;
  readonly odpConfig: OdpConfig;
}

export const odpIntegrationsAreEqual = (config1: OdpIntegrationConfig, config2: OdpIntegrationConfig): boolean => {
  if (config1.integrated !== config2.integrated) {
    return false;
  }

  if (config1.integrated && config2.integrated) {
    return config1.odpConfig.equals(config2.odpConfig);
  }

  return true;
}

export type OdpIntegrationConfig = OdpNotIntegratedConfig | OdpIntegratedConfig;
