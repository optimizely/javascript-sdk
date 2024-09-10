/**
 * Copyright 2022-2023 Optimizely
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
import decompressResponse from 'decompress-response';
import { LogHandler } from '../../modules/logging';
import { REQUEST_TIMEOUT_MS } from '../enums';

/**
 * Handles sending requests and receiving responses over HTTP via NodeJS http module
 */
export class NodeRequestHandler implements RequestHandler {
  private readonly logger?: LogHandler;
  private readonly timeout: number;

  constructor(opt: { logger?: LogHandler, timeout?: number } = {}) {
    this.logger = opt.logger;
    this.timeout = opt.timeout ?? REQUEST_TIMEOUT_MS;
  }

  /**
   * Builds an XMLHttpRequest
   * @param requestUrl Fully-qualified URL to which to send the request
   * @param headers List of headers to include in the request
   * @param method HTTP method to use
   * @param data? stringified version of data to POST, PUT, etc
   * @returns AbortableRequest contains both the response Promise and capability to abort()
   */
  makeRequest(requestUrl: string, headers: Headers, method: string, data?: string): AbortableRequest {
    const parsedUrl = url.parse(requestUrl);

    if (parsedUrl.protocol !== 'https:') {
      return {
        responsePromise: Promise.reject(new Error(`Unsupported protocol: ${parsedUrl.protocol}`)),
        abort: () => {},
      };
    }

    const request = https.request({
      ...this.getRequestOptionsFromUrl(parsedUrl),
      method,
      headers: {
        ...headers,
        'accept-encoding': 'gzip,deflate',
      },
      timeout: this.timeout,
    });
    const abortableRequest = this.getAbortableRequestFromRequest(request);

    if (data) {
      request.write(data);
    }
    request.end();

    return abortableRequest;
  }

  /**
   * Parses a URL into its constituent parts
   * @param url URL object to parse
   * @private
   * @returns https.RequestOptions Standard request options dictionary
   */
  private getRequestOptionsFromUrl(url: url.UrlWithStringQuery): https.RequestOptions {
    return {
      hostname: url.hostname,
      path: url.path,
      port: url.port,
      protocol: url.protocol,
    };
  }

  /**
   * Parses headers from an http response
   * @param incomingMessage Incoming response message to parse
   * @private
   * @returns Headers Dictionary of headers without duplicates
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

  /**
   * Sends a built request handling response, errors, and events around the transmission
   * @param request Request to send
   * @private
   * @returns AbortableRequest with simplified response promise
   */
  private getAbortableRequestFromRequest(request: http.ClientRequest): AbortableRequest {
    let aborted = false;

    const abort = () => {
      aborted = true;
      request.destroy();
    };

    const responsePromise: Promise<Response> = new Promise((resolve, reject) => {
      request.on('timeout', () => {
        aborted = true;
        request.destroy();
        reject(new Error('Request timed out'));
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request.on('error', (err: any) => {
        if (err instanceof Error) {
          reject(err);
        } else if (typeof err === 'string') {
          reject(new Error(err));
        } else {
          reject(new Error('Request error'));
        }
      });

      request.once('response', (incomingMessage: http.IncomingMessage) => {
        if (aborted) {
          return;
        }

        const response = decompressResponse(incomingMessage);

        response.setEncoding('utf8');

        let responseData = '';
        response.on('data', (chunk: string) => {
          if (!aborted) {
            responseData += chunk;
          }
        });

        response.on('end', () => {
          if (aborted) {
            return;
          }

          if (!incomingMessage.statusCode) {
            reject(new Error('No status code in response'));
            return;
          }

          resolve({
            statusCode: incomingMessage.statusCode,
            body: responseData,
            headers: this.createHeadersFromNodeIncomingMessage(incomingMessage),
          });
        });
      });
    });

    return { abort, responsePromise };
  }
}
