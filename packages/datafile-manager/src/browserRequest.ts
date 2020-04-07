/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AbortableRequest, Response as InternalResponse, Headers as InternalHeaders } from './http';
import { REQUEST_TIMEOUT_MS } from './config';
import { getLogger } from '@optimizely/js-sdk-logging';

const logger = getLogger('DatafileManager');

function internalHeadersOfResponseHeaders(fetchAPIHeaders: Headers): InternalHeaders {
  const headers: InternalHeaders = {};
  fetchAPIHeaders.forEach((value: string, key: string) => {
    headers[key] = value;
  });
  return headers;
}

function headersInitOfInternalHeaders(internalHeaders: InternalHeaders): HeadersInit {
  const headersInit: string[][] = [];
  Object.keys(internalHeaders).forEach((headerName: string): void => {
    headersInit.push([headerName, internalHeaders[headerName]!]);
  });
  return headersInit;
}

export function makeGetRequest(reqUrl: string, headers: InternalHeaders): AbortableRequest {
  const abortController = new AbortController();

  const timeout = setTimeout(() => {
    logger.error('Request timed out');
    abortController.abort();
  }, REQUEST_TIMEOUT_MS);

  const responsePromise: Promise<InternalResponse> = fetch(reqUrl, {
    signal: abortController.signal,
    headers: headersInitOfInternalHeaders(headers),
  })
    .then((response: Response) =>
      response.text().then(
        (responseText: string): InternalResponse => ({
          statusCode: response.status,
          body: responseText,
          headers: internalHeadersOfResponseHeaders(response.headers),
        })
      )
    )
    .then(
      (response: InternalResponse): InternalResponse => {
        clearTimeout(timeout);
        return response;
      },
      (err: any): never => {
        clearTimeout(timeout);
        throw err;
      }
    );

  return {
    responsePromise,
    abort(): void {
      abortController.abort();
    },
  };
}
