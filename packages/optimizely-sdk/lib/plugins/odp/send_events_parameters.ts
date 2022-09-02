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

import { OdpEvent } from './odp_event';
import { OdpRequestParameters } from './odp_request_parameters';

/**
 * Handles parameters used in send ODP events
 */
export class SendEventsParameters extends OdpRequestParameters {
  /**
   * Collection of ODP events to transmit
   */
  public events: OdpEvent[] | undefined;

  /**
   * HTTP Verb used to send request
   */
  public httpVerb = 'POST';

  constructor(parameters: { apiKey: string, apiEndpoint: string, events: OdpEvent[] }) {
    super();
    Object.assign(this, parameters);
  }

  /**
   * Convert events to JSON format
   */
  public toGraphQLJson(): string {
    return JSON.stringify(this.events);
  }
}
