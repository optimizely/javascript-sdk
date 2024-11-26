/**
 * Copyright 2024, Optimizely
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
import { OdpConfig } from '../odp_config';
import { OdpEvent } from './odp_event'
import { OdpEventApiManager } from './odp_event_api_manager';
import { HttpMethod } from '../../utils/http_request_handler/http';

export class NodeOdpEventApiManager extends OdpEventApiManager {
  protected shouldSendEvents(events: OdpEvent[]): boolean {
    return true;
  }

  protected generateRequestData(
    odpConfig: OdpConfig,
    events: OdpEvent[]
  ): { method: HttpMethod; endpoint: string; headers: { [key: string]: string }; data: string } {

    const { apiHost, apiKey } = odpConfig;
    
    return {
      method: 'POST',
      endpoint: `${apiHost}/v3/events`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      data: JSON.stringify(events, this.replacer),
    };
  }

  private replacer(_: unknown, value: unknown) {
    if (value instanceof Map) {
      return Object.fromEntries(value);
    } else {
      return value;
    }
  }
}
