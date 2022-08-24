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

const FETCH_FAILURE_MESSAGE = 'Audience segments fetch failed';
const EMPTY_JSON_RESPONSE = null;

export interface IOdpClient {
  querySegments(parameters: QuerySegmentsParameters): Promise<string | null>;
}

export class OdpClient implements IOdpClient {

  private readonly _errorHandler: ErrorHandler;
  private readonly _logger: LogHandler;

  constructor(errorHandler: ErrorHandler, logger: LogHandler) {
    this._errorHandler = errorHandler ?? new NoopErrorHandler();
    this._logger = logger ?? new NoOpLogger();
  }

  public async querySegments(parameters: QuerySegmentsParameters): Promise<string | null> {
    if (!parameters?.apiHost || !parameters?.apiKey) {
      this._logger.log(LogLevel.ERROR, 'No ApiHost or ApiKey set before querying segments');
      return EMPTY_JSON_RESPONSE;
    }

    const method = 'POST';
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': parameters.apiKey,
    };
    const body = parameters.toGraphQLJson();

    let response: Response;

    try {
      response = await fetch(parameters.apiHost, { method, headers, body });
    } catch (error) {
      this._errorHandler.handleError(error);
      this._logger.log(LogLevel.ERROR, `${FETCH_FAILURE_MESSAGE} (network error)`);
      return EMPTY_JSON_RESPONSE;
    }

    if (!response.ok) {
      this._logger.log(LogLevel.ERROR, `${FETCH_FAILURE_MESSAGE} (${response?.status ?? 'network error'})`);
      return EMPTY_JSON_RESPONSE;
    }

    return response.json();
  }
}
