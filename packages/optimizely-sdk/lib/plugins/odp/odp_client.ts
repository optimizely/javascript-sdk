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
import { QuerySegmentsParameters } from './query_segments_parameters';
import axios, { AxiosError, AxiosResponse } from 'axios';

export interface IOdpClient {
  querySegments(parameters: QuerySegmentsParameters): Promise<string | undefined>;
}

export class OdpClient implements IOdpClient {
  private readonly _logger: LogHandler;

  constructor(logger: LogHandler) {
    this._logger = logger;
  }

  public async querySegments(parameters: QuerySegmentsParameters): Promise<string | undefined> {
    const data = parameters.ToJson();

    if (!parameters?.ApiHost || !parameters?.ApiKey) {
      this._logger.log(LogLevel.ERROR, 'No ApiHost or ApiKey set before querying segments');
      return;
    }

    const fetchFailureMessage = 'Audience segments fetch failed';

    let response: AxiosResponse;

    try {
      response = await axios(parameters.ApiHost,
        {
          method: 'post',
          url: parameters.ApiHost,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'x-api-key': parameters.ApiKey,
          },
          data,
        });
    } catch (error) {
      const response = (error as AxiosError).response;
      this._logger.log(LogLevel.ERROR, `${fetchFailureMessage} (${response?.status ?? 'network error'})`);
      return;
    }

    return response.data;
  }
}
