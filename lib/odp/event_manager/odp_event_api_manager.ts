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

import { LoggerFacade } from '../../modules/logging';
import { OdpEvent } from './odp_event';
import { HttpMethod, RequestHandler } from '../../utils/http_request_handler/http';
import { OdpConfig } from '../odp_config';

export type EventDispatchResponse = {
  statusCode?: number;
};
export interface OdpEventApiManager {
  sendEvents(odpConfig: OdpConfig, events: OdpEvent[]): Promise<EventDispatchResponse>;
}

export type EventRequest = {
  method: HttpMethod;
  endpoint: string;
  headers: Record<string, string>;
  data: string;
}

export type EventRequestGenerator = (odpConfig: OdpConfig, events: OdpEvent[]) => EventRequest;
export class DefaultOdpEventApiManager implements OdpEventApiManager {
  private logger?: LoggerFacade;
  private requestHandler: RequestHandler;
  private requestGenerator: EventRequestGenerator;

  constructor(
    requestHandler: RequestHandler,
    requestDataGenerator: EventRequestGenerator,
    logger?: LoggerFacade
  ) {
    this.requestHandler = requestHandler;
    this.requestGenerator = requestDataGenerator;
    this.logger = logger;
  }

  async sendEvents(odpConfig: OdpConfig, events: OdpEvent[]): Promise<EventDispatchResponse> {
    if (events.length === 0) {
      return Promise.resolve({});
    }

    const { method, endpoint, headers, data } = this.requestGenerator(odpConfig, events);

    const request = this.requestHandler.makeRequest(endpoint, headers, method, data);
    return request.responsePromise;
  }
}

export const pixelApiRequestGenerator: EventRequestGenerator = (odpConfig: OdpConfig, events: OdpEvent[]): EventRequest => {
  const pixelApiPath = 'v2/zaius.gif';
  const pixelApiEndpoint = new URL(pixelApiPath, odpConfig.pixelUrl);

  const apiKey = odpConfig.apiKey;
  const method = 'GET';
  const event = events[0];

  event.identifiers.forEach((v, k) => {
    pixelApiEndpoint.searchParams.append(k, v);
  });
  event.data.forEach((v, k) => {
    pixelApiEndpoint.searchParams.append(k, v as string);
  });
  pixelApiEndpoint.searchParams.append('tracker_id', apiKey);
  pixelApiEndpoint.searchParams.append('event_type', event.type);
  pixelApiEndpoint.searchParams.append('vdl_action', event.action);
  const endpoint = pixelApiEndpoint.toString();

  return {
    method,
    endpoint,
    headers: {},
    data: '',
  };
}

export const eventApiRequestGenerator: EventRequestGenerator = (odpConfig: OdpConfig, events: OdpEvent[]): EventRequest => {
  const { apiHost, apiKey } = odpConfig;
  
  return {
    method: 'POST',
    endpoint: `${apiHost}/v3/events`,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    data: JSON.stringify(events, (_: unknown, value: unknown) => {
      return value instanceof Map ? Object.fromEntries(value) : value;
    }),
  };
}
