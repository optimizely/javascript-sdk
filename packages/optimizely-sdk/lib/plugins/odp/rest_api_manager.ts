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


import { ErrorHandler, LogHandler } from '../../modules/logging';
import { IOdpClient, OdpClient } from './odp_client';
import { RequestHandlerFactory } from '../../utils/http_request_handler/request_handler_factory';
import { OdpEvent } from './odp_event';

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
  private readonly errorHandler: ErrorHandler;
  private readonly logger: LogHandler;
  private readonly odpClient: IOdpClient;

  /**
   * Creates instance to access Optimizely Data Platform (ODP) REST API
   * @param errorHandler Handler to record exceptions
   * @param logger Collect and record events/errors for this REST implementation
   * @param client HTTP Client used to send data to ODP
   */
  constructor(errorHandler: ErrorHandler, logger: LogHandler, client?: IOdpClient) {
    this.errorHandler = errorHandler;
    this.logger = logger;

    this.odpClient = client ?? new OdpClient(this.errorHandler,
      this.logger,
      RequestHandlerFactory.createHandler(this.logger));
  }

  /**
   * Service for sending ODP events to REST API
   * @param apiKey ODP public key
   * @param apiHost Host of ODP endpoint
   * @param events ODP events to send
   * @returns Retry is true - if network or server error (5xx), otherwise false
   */
  public async sendEvents(apiKey: string, apiHost: string, events: OdpEvent[]): Promise<boolean> {
    if (events.length === 0) {
      return false;
    }

    const endpoint = `${apiHost}/v3/events`;
    const data = JSON.stringify(events);

    const statusCode = await this.odpClient.sendEvents(apiKey, endpoint, data);

    return statusCode === 0 || (statusCode >= 500 && statusCode < 600);
  }
}
