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
import { OdpConfig } from './odp_config';

const EVENT_SENDING_FAILURE_MESSAGE = 'ODP event send failed';
export const ODP_CONFIG_NOT_READY_MESSAGE = 'ODP config not ready';

/**
 * Manager for communicating with the Optimizely Data Platform REST API
 */
export interface IOdpEventApiManager {
  // sendEvents(apiKey: string, apiHost: string, events: OdpEvent[]): Promise<boolean>;
  sendEvents(events: OdpEvent[]): Promise<boolean>;
  updateSettings(odpConfig: OdpConfig): void;
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
   * ODP configuration settings for identifying the target API and segments
   */
  protected odpConfig?: OdpConfig;

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
   * Updatets odpConfig of the api manager instance
   * @param odpConfig 
   */
  updateSettings(odpConfig: OdpConfig): void {
    this.odpConfig = odpConfig;
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
  async sendEvents(events: OdpEvent[]): Promise<boolean> {
    let shouldRetry = false;

    if (!this.odpConfig?.isReady()) {
      this.logger.log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (${ODP_CONFIG_NOT_READY_MESSAGE})`);
      return shouldRetry;
    }

    if (events.length === 0) {
      this.logger.log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (no events)`);
      return shouldRetry;
    }

    if (!this.shouldSendEvents(events)) {
      return shouldRetry;
    }

    const { method, endpoint, headers, data } = this.generateRequestData(events);

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
    events: OdpEvent[]
  ): {
    method: string;
    endpoint: string;
    headers: { [key: string]: string };
    data: string;
  };
}
