/****************************************************************************
 * Copyright 2024, Optimizely, Inc. and contributors                        *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/

import { OdpEvent } from '../../../core/odp/odp_event';
import { OdpEventApiManager } from '../../../core/odp/odp_event_api_manager';
import { LogLevel } from '../../../modules/logging';
import { OdpConfig, OdpIntegrationConfig } from '../../../core/odp/odp_config';

const EVENT_SENDING_FAILURE_MESSAGE = 'ODP event send failed';

const pixelApiPath = 'v2/zaius.gif';

export class BrowserOdpEventApiManager extends OdpEventApiManager {
  protected shouldSendEvents(events: OdpEvent[]): boolean {
    if (events.length <= 1) {
      return true;
    }
    this.getLogger().log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (browser only supports batch size 1)`);
    return false;
  }

  private getPixelApiEndpoint(odpConfig: OdpConfig): string {
    const pixelUrl = odpConfig.pixelUrl;
    const pixelApiEndpoint = new URL(pixelApiPath, pixelUrl).href;
    return pixelApiEndpoint;
  }

  protected generateRequestData(
    odpConfig: OdpConfig,
    events: OdpEvent[]
  ): { method: string; endpoint: string; headers: { [key: string]: string }; data: string } {
    const pixelApiEndpoint = this.getPixelApiEndpoint(odpConfig);

    const apiKey = odpConfig.apiKey;
    const method = 'GET';
    const event = events[0];
    const url = new URL(pixelApiEndpoint);
    event.identifiers.forEach((v, k) => {
      url.searchParams.append(k, v);
    });
    event.data.forEach((v, k) => {
      url.searchParams.append(k, v as string);
    });
    url.searchParams.append('tracker_id', apiKey);
    url.searchParams.append('event_type', event.type);
    url.searchParams.append('vdl_action', event.action);
    const endpoint = url.toString();
    return {
      method,
      endpoint,
      headers: {},
      data: '',
    };
  }
}
