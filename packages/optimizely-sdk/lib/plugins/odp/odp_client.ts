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
import { QuerySegmentsParameters } from './query_segments_parameters';
import { RequestHandler, Response } from '../../utils/http_request_handler/http';
import { REQUEST_TIMEOUT_MS } from '../../utils/http_request_handler/config';
import { SendEventsParameters } from './send_events_parameters';

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
  querySegments(parameters: QuerySegmentsParameters): Promise<string | null>;

  sendEvents(parameters: SendEventsParameters): Promise<number | null>;
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
  public async querySegments(parameters: QuerySegmentsParameters): Promise<string | null> {
    const { apiEndpoint, apiKey, httpVerb, userKey, userValue, segmentsToCheck } = parameters;

    if (segmentsToCheck?.length === 0) {
      return '';
    }

    if (!apiEndpoint || !apiKey) {
      this._logger.log(LogLevel.ERROR, 'No ApiHost or ApiKey set before querying segments');
      return null;
    }

    if (!userKey || !userValue) {
      this._logger.log(LogLevel.ERROR, 'No UserKey or UserValue set before querying segments');
      return null;
    }

    const method = httpVerb;
    const url = apiEndpoint;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };
    const data = parameters.toGraphQLJson();

    let response: Response;
    try {
      const request = this._requestHandler.makeRequest(url, headers, method, data);
      response = await request.responsePromise;
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
   * @param parameters
   * @returns
   * 1. null, When there was a non-recoverable error and no retry is needed.
   * 2. 0 If an unexpected error occurred and retrying can be useful.
   * 3. HTTPStatus code if httpclient was able to make the request and was able to receive response.
   *    It is recommended to retry if status code was 5xx.
   */
  public async sendEvents(parameters: SendEventsParameters): Promise<number | null> {
    const { apiEndpoint, apiKey, httpVerb, events } = parameters;

    if (events?.length === 0) {
      return null;
    }

    if (!apiEndpoint || !apiKey) {
      this._logger.log(LogLevel.ERROR, 'No ApiEndpoint or ApiKey set before attempting to send ODP events');
      return null;
    }

    const method = httpVerb;
    const url = apiEndpoint;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };
    const data = parameters.toJson();

    let response: Response;
    try {
      const request = this._requestHandler.makeRequest(url, headers, method, data);
      response = await request.responsePromise;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this._errorHandler.handleError(error);
      this._logger.log(LogLevel.ERROR, `${EVENT_SENDING_FAILURE_MESSAGE} (network error)`);

      return 0;
    }

    return response.statusCode ?? 0;
  }
}
