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
import { RequestHandler, Response } from '../../utils/http_request_handler/http';
import { REQUEST_TIMEOUT_MS } from '../../utils/http_request_handler/config';

/**
 * Standard message for audience querying fetch errors
 */
const AUDIENCE_FETCH_FAILURE_MESSAGE = 'Audience segments fetch failed';
/**
 * Standard message for sending events errors
 */
const EVENT_SENDING_FAILURE_MESSAGE = 'ODP event send failed';

/**
 * Interface for sending requests and handling responses to Optimizely Data Platform
 */
export interface IOdpClient {
  querySegments(apiKey: string, apiEndpoint: string, userKey: string, userValue: string, graphQlQuery: string): Promise<string | null>;

  sendEvents(apiKey: string, apiEndpoint: string, jsonData: string): Promise<number>;
}

/**
 * Http implementation for sending requests and handling responses to Optimizely Data Platform
 */
export class OdpClient implements IOdpClient {
  private readonly logger: LogHandler;
  private readonly timeout: number;
  private readonly requestHandler: RequestHandler;

  /**
   * An implementation for sending requests and handling responses to Optimizely Data Platform (ODP)
   * @param logger Collect and record events/errors for this ODP client
   * @param requestHandler Client implementation to send/receive requests over HTTP
   * @param timeout Maximum milliseconds before requests are considered timed out
   */
  constructor(logger: LogHandler, requestHandler: RequestHandler, timeout: number = REQUEST_TIMEOUT_MS) {
    this.logger = logger;
    this.requestHandler = requestHandler;
    this.timeout = timeout;
  }

  /**
   * Handler for querying the ODP GraphQL endpoint
   * @param apiKey ODP API key
   * @param graphQlEndpoint Fully-qualified GraphQL endpoint URL
   * @param userKey 'vuid' or 'fs_user_id'
   * @param userValue userKey's value
   * @param graphQlQuery GraphQL formatted query string
   * @returns JSON response string from ODP or null
   */
  public async querySegments(apiKey: string, graphQlEndpoint: string, userKey: string, userValue: string, graphQlQuery: string): Promise<string | null> {
    const method = 'POST';
    const url = graphQlEndpoint;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };

    let response: Response;
    try {
      const request = this.requestHandler.makeRequest(url, headers, method, graphQlQuery);
      response = await request.responsePromise;
    } catch {
      this.logger.log(LogLevel.ERROR, `${AUDIENCE_FETCH_FAILURE_MESSAGE} (network error)`);

      return null;
    }

    return response.body;
  }

  /**
   * Handler for sending ODP events
   * @param apiKey ODP API key
   * @param restApiEndpoint Fully-qualified REST API endpoint URL
   * @param data JSON event data payload
   * @returns
   * 0 = If an unexpected error occurred and retrying can be useful
   * Otherwise HTTPStatus code NOTE: it is recommended to retry if status code was 5xx.
   */
  public async sendEvents(apiKey: string, restApiEndpoint: string, data: string): Promise<number> {
    const method = 'POST';
    const url = restApiEndpoint;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };

    let response: Response;
    try {
      const request = this.requestHandler.makeRequest(url, headers, method, data);
      response = await request.responsePromise;
    } catch {
      this.logger.log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (network error)`);

      return 0;
    }

    return response.statusCode ?? 0;
  }
}
