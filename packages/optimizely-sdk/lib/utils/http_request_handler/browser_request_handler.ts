/**
 * Copyright 2019-2020, 2022 Optimizely
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

import { AbortableRequest, Headers, RequestHandler, Response } from './http';
import { REQUEST_TIMEOUT_MS } from './config';
import { LogHandler, LogLevel } from '../../modules/logging';
import { NoOpLogger } from '../../plugins/logger';

const READY_STATE_DONE = 4;

export class BrowserRequestHandler implements RequestHandler {
  private readonly _logger: LogHandler;
  private readonly _timeout: number;

  public constructor(logger?: LogHandler, timeout: number = REQUEST_TIMEOUT_MS) {
    this._logger = logger ?? new NoOpLogger();
    this._timeout = timeout;
  }

  public makeRequest(reqUrl: string, headers: Headers, method: string, data?: string): AbortableRequest {
    const request = new XMLHttpRequest();

    const responsePromise: Promise<Response> = new Promise((resolve, reject) => {
      request.open(method, reqUrl, true);

      this.setHeadersInXhr(headers, request);

      request.onreadystatechange = (): void => {
        if (request.readyState === READY_STATE_DONE) {
          const statusCode = request.status;
          if (statusCode === 0) {
            reject(new Error('Request error'));
            return;
          }

          const headers = this.parseHeadersFromXhr(request);
          const resp: Response = {
            statusCode: request.status,
            body: request.responseText,
            headers,
          };
          resolve(resp);
        }
      };

      request.timeout = this._timeout;

      request.ontimeout = (): void => {
        this._logger.log(LogLevel.WARNING, 'Request timed out');
      };

      request.send(data);
    });

    return {
      responsePromise,
      abort(): void {
        request.abort();
      },
    };
  }

  private setHeadersInXhr(headers: Headers, req: XMLHttpRequest): void {
    Object.keys(headers).forEach(headerName => {
      const header = headers[headerName];
      if (typeof header === 'string') {
        req.setRequestHeader(headerName, header);
      }
    });
  }

  private parseHeadersFromXhr(req: XMLHttpRequest): Headers {
    const allHeadersString = req.getAllResponseHeaders();

    if (allHeadersString === null) {
      return {};
    }

    const headerLines = allHeadersString.split('\r\n');
    const headers: Headers = {};
    headerLines.forEach(headerLine => {
      const separatorIndex = headerLine.indexOf(': ');
      if (separatorIndex > -1) {
        const headerName = headerLine.slice(0, separatorIndex);
        const headerValue = headerLine.slice(separatorIndex + 2);
        if (headerValue.length > 0) {
          headers[headerName] = headerValue;
        }
      }
    });
    return headers;
  }
}
