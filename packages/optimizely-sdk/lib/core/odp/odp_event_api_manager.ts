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
export abstract class OdpEventApiManager implements IOdpEventApiManager {
  /**
   * Handler for recording execution logs
   * @private
   */
  private readonly logger: LogHandler;

  /**
   * Handler for making external HTTP/S requests
   * @private
   */
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

  getLogger(): LogHandler {
    return this.logger;
  }

  /**
   * Service for sending ODP events to REST API
   * @param apiKey ODP public key
   * @param apiHost Host of ODP endpoint
   * @param events ODP events to send
   * @returns Retry is true - if network or server error (5xx), otherwise false
   */
  async sendEvents(apiKey: string, apiHost: string, events: OdpEvent[]): Promise<boolean> {
    let shouldRetry = false;

    if (!apiKey || !apiHost) {
      this.logger.log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (Parameters apiKey or apiHost invalid)`);
      return shouldRetry;
    }

    if (events.length === 0) {
      this.logger.log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (no events)`);
      return shouldRetry;
    }

    if (!this.shouldSendEvents(events)) {
      return shouldRetry;
    }

    const { method, endpoint, headers, data } = this.generateRequestData(apiHost, apiKey, events);

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

  protected abstract shouldSendEvents(events: OdpEvent[]): boolean;

  protected abstract generateRequestData(
    apiHost: string,
    apiKey: string,
    events: OdpEvent[]
  ): {
    method: string;
    endpoint: string;
    headers: { [key: string]: string };
    data: string;
  };
}
