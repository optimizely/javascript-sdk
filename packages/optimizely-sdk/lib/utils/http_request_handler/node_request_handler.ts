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

import http from 'http';
import https from 'https';
import url from 'url';
import { AbortableRequest, Headers, RequestHandler, Response } from './http';
import { REQUEST_TIMEOUT_MS } from './config';
import decompressResponse from 'decompress-response';
import { LogHandler } from '../../modules/logging';
import { NoOpLogger } from '../../plugins/logger';

export class NodeRequestHandler implements RequestHandler {
  private readonly _logger: LogHandler;
  private readonly _timeout: number;

  public constructor(logger?: LogHandler, timeout: number = REQUEST_TIMEOUT_MS) {
    this._logger = logger ?? new NoOpLogger();
    this._timeout = timeout;
  }

  public makeRequest(reqUrl: string, headers: Headers, method: string, data?: string): AbortableRequest {
    const parsedUrl = url.parse(reqUrl);

    if (parsedUrl.protocol !== 'https:') {
      return {
        responsePromise: Promise.reject(new Error(`Unsupported protocol: ${parsedUrl.protocol}`)),
        abort(): void {
        },
      };
    }

    const request = https.request({
      ...this.getRequestOptionsFromUrl(parsedUrl),
      method,
      headers: {
        ...headers,
        'accept-encoding': 'gzip,deflate',
      },
    });
    const responsePromise = this.getResponseFromRequest(request);

    request.write(data);
    request.end();

    return {
      abort: () => request.abort(),
      responsePromise,
    };
  }

  private getRequestOptionsFromUrl(url: url.UrlWithStringQuery): https.RequestOptions {
    return {
      hostname: url.hostname,
      path: url.path,
      port: url.port,
      protocol: url.protocol,
    };
  }

  /**
   * Convert IncomingMessage.headers (which has type http.IncomingHttpHeaders) into our Headers type defined in src/http.ts.
   *
   * Our Headers type is simplified and can't represent multiple values for the same header name.
   *
   * We don't currently need multiple values support, and the consumer code becomes simpler if it can assume at-most 1 value
   * per header name.
   */
  private createHeadersFromNodeIncomingMessage(incomingMessage: http.IncomingMessage): Headers {
    const headers: Headers = {};
    Object.keys(incomingMessage.headers).forEach(headerName => {
      const headerValue = incomingMessage.headers[headerName];
      if (typeof headerValue === 'string') {
        headers[headerName] = headerValue;
      } else if (typeof headerValue === 'undefined') {
        // no value provided for this header
      } else {
        // array
        if (headerValue.length > 0) {
          // We don't care about multiple values - just take the first one
          headers[headerName] = headerValue[0];
        }
      }
    });
    return headers;
  }

  private getResponseFromRequest(request: http.ClientRequest): Promise<Response> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        request.abort();
        reject(new Error('Request timed out'));
      }, this._timeout);

      request.once('response', (incomingMessage: http.IncomingMessage) => {
        if (request.destroyed) {
          return;
        }

        const response = decompressResponse(incomingMessage);

        response.setEncoding('utf8');

        let responseData = '';
        response.on('data', (chunk: string) => {
          if (!request.destroyed) {
            responseData += chunk;
          }
        });

        response.on('end', () => {
          if (request.destroyed) {
            return;
          }

          clearTimeout(timeout);

          resolve({
            statusCode: incomingMessage.statusCode,
            body: responseData,
            headers: this.createHeadersFromNodeIncomingMessage(incomingMessage),
          });
        });
      });
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request.on('error', (err: any) => {
        clearTimeout(timeout);

        if (err instanceof Error) {
          reject(err);
        } else if (typeof err === 'string') {
          reject(new Error(err));
        } else {
          reject(new Error('Request error'));
        }
      });
    });
  }
}





