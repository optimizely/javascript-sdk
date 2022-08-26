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
import { Response } from '../../utils/http_request_handler/http';
import { RequestHandlerFactory } from '../../utils/http_request_handler/request_handler_factory';
import { REQUEST_TIMEOUT_MS } from '../../utils/http_request_handler/config';

const FETCH_FAILURE_MESSAGE = 'Audience segments fetch failed';
const EMPTY_JSON_RESPONSE = null;

export interface IOdpClient {
  querySegments(parameters: QuerySegmentsParameters): Promise<string | null>;
}

export enum ExecutionContextType {
  notDefined,
  browser,
  node,
}

export class OdpClient implements IOdpClient {

  private readonly _errorHandler: ErrorHandler;
  private readonly _logger: LogHandler;
  private readonly _timeout: number;
  private readonly _executionContextType: ExecutionContextType;


  constructor(errorHandler?: ErrorHandler, logger?: LogHandler, timeout?: number) {
    this._errorHandler = errorHandler ?? new NoopErrorHandler();
    this._logger = logger ?? new NoOpLogger();
    this._timeout = timeout ?? REQUEST_TIMEOUT_MS;

    this._executionContextType = ExecutionContextType.notDefined;
    if (typeof window === 'object') {
      this._executionContextType = ExecutionContextType.browser;
    } else if (typeof process === 'object') {
      this._executionContextType = ExecutionContextType.node;
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

    const requestHandler = RequestHandlerFactory.createHandler(this._executionContextType.toString(), this._logger, this._timeout);
    if (!requestHandler) {
      this._logger.log(LogLevel.ERROR, 'Unable to determine execution context');
      return EMPTY_JSON_RESPONSE;
    }

    let response: Response;
    try {
      response = await requestHandler.makeRequest(url, headers, method, data).responsePromise;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this._errorHandler.handleError(error);

      return EMPTY_JSON_RESPONSE;
    }

    if (response.statusCode !== 200) {
      this._logger.log(LogLevel.ERROR, `${FETCH_FAILURE_MESSAGE} (${response.statusCode ?? 'network error'})`);
      return EMPTY_JSON_RESPONSE;
    }

    return response.body;
  }
}
