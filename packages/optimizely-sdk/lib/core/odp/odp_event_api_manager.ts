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

import { LogHandler, LogLevel } from '../../modules/logging';
import { OdpEvent } from './odp_event';
import { RequestHandler } from '../../utils/http_request_handler/http';

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

  /**
   * Creates instance to access Optimizely Data Platform (ODP) REST API
   * @param requestHandler Desired request handler for testing
   * @param logger Collect and record events/errors for this GraphQL implementation
   */
  constructor(requestHandler: RequestHandler, logger: LogHandler) {
    this.requestHandler = requestHandler;
    this.logger = logger;
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

    const endpoint = `${apiHost}/v3/events`;
    const data = JSON.stringify(events, this.replacer);

    const method = 'POST';
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };

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
