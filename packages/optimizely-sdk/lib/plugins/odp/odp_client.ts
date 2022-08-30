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

import { ErrorHandler, LogHandler, LogLevel, NoopErrorHandler } from '../../modules/logging';
import { QuerySegmentsParameters } from './query_segments_parameters';
import { NoOpLogger } from '../logger';
import { RequestHandler, Response } from '../../utils/http_request_handler/http';
import { RequestHandlerFactory } from '../../utils/http_request_handler/request_handler_factory';
import { REQUEST_TIMEOUT_MS } from '../../utils/http_request_handler/config';

/**
 * Standard failure message for fetch errors
 */
const FETCH_FAILURE_MESSAGE = 'Audience segments fetch failed';
/**
 * Return value for scenarios with no valid JSON
 */
const EMPTY_JSON_RESPONSE = null;

/**
 * Interface for sending requests and handling responses to Optimizely Data Platform
 */
export interface IOdpClient {
  querySegments(parameters: QuerySegmentsParameters): Promise<string | null>;
}

/**
 * Valid types of Javascript contexts in which this code is executing
 */
enum ExecutionContextType {
  notDefined,
  browser,
  node,
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
  constructor(errorHandler?: ErrorHandler, logger?: LogHandler, requestHandler?: RequestHandler, timeout?: number) {
    this._errorHandler = errorHandler ?? new NoopErrorHandler();
    this._logger = logger ?? new NoOpLogger();
    this._timeout = timeout ?? REQUEST_TIMEOUT_MS;

    if (requestHandler) {
      this._requestHandler = requestHandler;
    } else {
      let executionContextType = typeof window === 'object' ? ExecutionContextType.browser : ExecutionContextType.notDefined;
      executionContextType = typeof process === 'object' ? ExecutionContextType.node : executionContextType;
      this._requestHandler = RequestHandlerFactory.createHandler(ExecutionContextType[executionContextType], this._logger, this._timeout);
    }
  }

  /**
   * Handler for querying the ODP GraphQL endpoint
   * @param parameters
   * @returns JSON response string from ODP
   */
  public async querySegments(parameters: QuerySegmentsParameters): Promise<string | null> {
    if (!parameters?.apiHost || !parameters?.apiKey) {
      this._logger.log(LogLevel.ERROR, 'No ApiHost or ApiKey set before querying segments');
      return EMPTY_JSON_RESPONSE;
    }

    const method = 'POST';
    const url = parameters.apiHost;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': parameters.apiKey,
    };
    const data = parameters.toGraphQLJson();

    let response: Response;
    try {
      const request = this._requestHandler.makeRequest(url, headers, method, data);
      response = await request.responsePromise;
    } catch (error) {
      this._errorHandler.handleError(error);
      this._logger.log(LogLevel.ERROR, `${FETCH_FAILURE_MESSAGE} (${error.statusCode ?? 'network error'})`);

      return EMPTY_JSON_RESPONSE;
    }

    return response.body;
  }
}
