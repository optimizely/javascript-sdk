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

import { LogHandler, LogLevel } from '../../modules/logging';
import { OdpEvent } from './odp_event';
import { browserMode } from './odp_utils';
import { RequestHandler } from '../../utils/http_request_handler/http';
import { ODP_EVENT_BROWSER_ENDPOINT } from '../../utils/enums';

const EVENT_SENDING_FAILURE_MESSAGE = 'ODP event send failed';

/**
 * Manager for communicating with the Optimizely Data Platform REST API
 */
export interface IOdpEventApiManager {
  sendEvents(apiKey: string, apiHost: string, events: OdpEvent[]): Promise<boolean>;
}

/**
 * Concrete implementation for accessing the ODP REST API
 */
export class OdpEventApiManager implements IOdpEventApiManager {
  private readonly logger: LogHandler;
  private readonly requestHandler: RequestHandler;
  private readonly browserMode: boolean;

  /**
   * Creates instance to access Optimizely Data Platform (ODP) REST API
   * @param requestHandler Desired request handler for testing
   * @param logger Collect and record events/errors for this GraphQL implementation
   */
  constructor(requestHandler: RequestHandler, logger: LogHandler) {
    this.requestHandler = requestHandler;
    this.logger = logger;
    this.browserMode = browserMode()
  }

  /**
   * Service for sending ODP events to REST API
   * @param apiKey ODP public key
   * @param apiHost Host of ODP endpoint
   * @param events ODP events to send
   * @returns Retry is true - if network or server error (5xx), otherwise false
   */
  public async sendEvents(apiKey: string, apiHost: string, events: OdpEvent[]): Promise<boolean> {
    let shouldRetry = false;

    if (!apiKey || !apiHost) {
      this.logger.log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (Parameters apiKey or apiHost invalid)`);
      return shouldRetry;
    }

    if (events.length === 0) {
      this.logger.log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (no events)`);
      return shouldRetry;
    }

    if (events.length > 1 && this.browserMode) {
      this.logger.log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (browser only supports batch size 1)`);
      return shouldRetry;
    }

    let method, endpoint, headers, data;

    if (this.browserMode) {
      method = 'GET';
      const event = events[0];
      const url = new URL(ODP_EVENT_BROWSER_ENDPOINT);
      event.identifiers.forEach((v, k) =>{
          url.searchParams.append(k, v);
      });
      event.data.forEach((v, k) =>{
          url.searchParams.append(k, v as string);
      });
      url.searchParams.append('tracker_id', apiKey);
      url.searchParams.append('event_type', event.type);
      url.searchParams.append('vdl_action', event.action);
      endpoint = url.toString();
      headers = {};
    } else {
      method = 'POST';
      endpoint = `${apiHost}/v3/events`;
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      };
      data = JSON.stringify(events, this.replacer);
    }



    let statusCode = 0;
    try {
      const request = this.requestHandler.makeRequest(endpoint, headers, method, data);
      const response = await request.responsePromise;
      statusCode = response.statusCode ?? statusCode;
    } catch (err) {
      let message = 'network error';
      if (err instanceof Error) {
        message = (err as Error).message;
      }
      this.logger.log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (${message})`);
      shouldRetry = true;
    }

    if (statusCode >= 400) {
      this.logger.log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (${statusCode})`);
    }

    if (statusCode >= 500) {
      shouldRetry = true;
    }

    return shouldRetry;
  }

  private replacer(_: unknown, value: unknown) {
    if (value instanceof Map) {
      return Object.fromEntries(value);
    } else {
      return value;
    }
  }
}
