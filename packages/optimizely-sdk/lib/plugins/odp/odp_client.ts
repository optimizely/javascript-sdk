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

import { ErrorHandler, LogHandler, LogLevel } from '../../modules/logging';
import { RequestHandler, Response } from '../../utils/http_request_handler/http';
import { REQUEST_TIMEOUT_MS } from '../../utils/http_request_handler/config';
import { ODP_USER_KEY } from '../../utils/enums';

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
  querySegments(apiKey: string, graphQlEndpoint: string, userKey: ODP_USER_KEY, userValue: string, data: string): Promise<string | null>;

  sendEvents(apiKey: string, restApiEndpoint: string, data: string): Promise<number>;
}

/**
 * Http implementation for sending requests and handling responses to Optimizely Data Platform
 */
export class OdpClient implements IOdpClient {
  private readonly _errorHandler: ErrorHandler;
  private readonly _logger: LogHandler;
  private readonly _timeout: number;
  private readonly _requestHandler: RequestHandler;

  /**
   * An implementation for sending requests and handling responses to Optimizely Data Platform (ODP)
   * @param errorHandler Handler to record exceptions
   * @param logger Collect and record events/errors for this ODP client
   * @param requestHandler Client implementation to send/receive requests over HTTP
   * @param timeout Maximum milliseconds before requests are considered timed out
   */
  constructor(errorHandler: ErrorHandler, logger: LogHandler, requestHandler: RequestHandler, timeout: number = REQUEST_TIMEOUT_MS) {
    this._errorHandler = errorHandler;
    this._logger = logger;
    this._requestHandler = requestHandler;
    this._timeout = timeout;
  }

  /**
   * Handler for querying the ODP GraphQL endpoint
   * @param parameters Query parameters to send to ODP
   * @returns JSON response string from ODP or null
   */

  /**
   * Handler for querying the ODP GraphQL endpoint
   * @param apiKey ODP API key
   * @param graphQlEndpoint Fully-qualified GraphQL endpoint URL
   * @param userKey 'vuid' or 'fs_user_id'
   * @param userValue userKey's value
   * @param data GraphyQL query string
   * @returns JSON response string from ODP or null
   */
  public async querySegments(apiKey: string, graphQlEndpoint: string, userKey: string, userValue: string, data: string): Promise<string | null> {

    const method = 'POST';
    const url = graphQlEndpoint;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };

    let response: Response;
    try {
      const request = this._requestHandler.makeRequest(url, headers, method, data);
      response = await request.responsePromise;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this._errorHandler.handleError(error);
      this._logger.log(LogLevel.ERROR, `${AUDIENCE_FETCH_FAILURE_MESSAGE} (network error)`);

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
      const request = this._requestHandler.makeRequest(url, headers, method, data);
      response = await request.responsePromise;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this._errorHandler.handleError(error);
      this._logger.log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (network error)`);

      return 0;
    }

    return response.statusCode ?? 0;
  }
}
