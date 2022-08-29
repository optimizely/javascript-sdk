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

const FETCH_FAILURE_MESSAGE = 'Audience segments fetch failed';
const EMPTY_JSON_RESPONSE = null;

export interface IOdpClient {
  querySegments(parameters: QuerySegmentsParameters): Promise<string | null>;
}

enum ExecutionContextType {
  notDefined,
  browser,
  node,
}

export class OdpClient implements IOdpClient {
  private readonly _errorHandler: ErrorHandler;
  private readonly _logger: LogHandler;
  private readonly _timeout: number;
  private readonly _requestHandler: RequestHandler;

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this._errorHandler.handleError(error);
      this._logger.log(LogLevel.ERROR, `${FETCH_FAILURE_MESSAGE} (${error.statusCode ?? 'network error'})`);

      return EMPTY_JSON_RESPONSE;
    }

    return response.body;
  }
}
