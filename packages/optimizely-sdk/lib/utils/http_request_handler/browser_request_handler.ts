/**
 * Copyright 2022 Optimizely
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

const READY_STATE_DONE = 4;

/**
 * Handles sending requests and receiving responses over HTTP via XMLHttpRequest
 */
export class BrowserRequestHandler implements RequestHandler {
  private readonly _logger: LogHandler;
  private readonly _timeout: number;

  public constructor(logger: LogHandler, timeout: number = REQUEST_TIMEOUT_MS) {
    this._logger = logger;
    this._timeout = timeout;
  }

  /**
   * Builds an XMLHttpRequest
   * @param requestUrl Fully-qualified URL to which to send the request
   * @param headers List of headers to include in the request
   * @param method HTTP method to use
   * @param data stringified version of data to POST, PUT, etc
   * @returns AbortableRequest contains both the response Promise and capability to abort()
   */
  public makeRequest(requestUrl: string, headers: Headers, method: string, data?: string): AbortableRequest {
    const request = new XMLHttpRequest();

    const responsePromise: Promise<Response> = new Promise((resolve, reject) => {
      request.open(method, requestUrl, true);

      this.setHeadersInXhr(headers, request);

      request.onreadystatechange = (): void => {
        if (request.readyState === READY_STATE_DONE) {
          const statusCode = request.status;
          if (statusCode === 0) {
            reject(new Error('Request error'));
            return;
          }

          const headers = this.parseHeadersFromXhr(request);
          const response: Response = {
            statusCode: request.status,
            body: request.responseText,
            headers,
          };
          resolve(response);
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

  /**
   * Sets the header collection for an XHR
   * @param headers Headers to set
   * @param request Request into which headers are to be set
   * @private
   */
  private setHeadersInXhr(headers: Headers, request: XMLHttpRequest): void {
    Object.keys(headers).forEach(headerName => {
      const header = headers[headerName];
      if (typeof header === 'string') {
        request.setRequestHeader(headerName, header);
      }
    });
  }

  /**
   * Parses headers from an XHR
   * @param request Request containing headers to be retrieved
   * @private
   * @returns List of headers without duplicates
   */
  private parseHeadersFromXhr(request: XMLHttpRequest): Headers {
    const allHeadersString = request.getAllResponseHeaders();

    if (allHeadersString === null) {
      return {};
    }

    const headerLines = allHeadersString.split('\r\n');
    const headers: Headers = {};
    headerLines.forEach(headerLine => {
      try {
        const separatorIndex = headerLine.indexOf(': ');
        if (separatorIndex > -1) {
          const headerName = headerLine.slice(0, separatorIndex);
          const headerValue = headerLine.slice(separatorIndex + 2);
          if (headerName && headerValue) {
            headers[headerName] = headerValue;
          }
        }
      } catch {
        this._logger.log(LogLevel.WARNING, `Unable to parse & skipped header item '${headerLine}'`);
      }
    });
    return headers;
  }
}
