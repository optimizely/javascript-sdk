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
import { RequestHandlerFactory } from '../../utils/http_request_handler/request_handler_factory';
import { OdpEvent } from './odp_event';
import { RequestHandler } from '../../utils/http_request_handler/http';
import { REQUEST_TIMEOUT_MS } from '../../utils/http_request_handler/config';

const EVENT_SENDING_FAILURE_MESSAGE = 'ODP event send failed';

/**
 * Manager for communicating with the Optimizely Data Platform REST API
 */
export interface IRestApiManager {
  sendEvents(apiKey: string, apiHost: string, events: OdpEvent[]): Promise<boolean>;
}

/**
 * Concrete implementation for accessing the ODP REST API
 */
export class RestApiManager implements IRestApiManager {
  private readonly logger: LogHandler;
  private readonly timeout: number;
  private readonly requestHandler: RequestHandler;

  /**
   * Creates instance to access Optimizely Data Platform (ODP) REST API
   * @param logger Collect and record events/errors for this REST implementation
   * @param timeout Milliseconds to wait for a response
   */
  constructor(logger: LogHandler, timeout: number = REQUEST_TIMEOUT_MS) {
    this.logger = logger;
    this.timeout = timeout;
    this.requestHandler = RequestHandlerFactory.createHandler(this.logger);
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
    const data = JSON.stringify(events);

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
    } catch {
      this.logger.log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (network error)`);
    }

    if (statusCode === 0) {
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
}
