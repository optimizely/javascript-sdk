/**
 * Copyright 2019-2020, Optimizely
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

import { AbortableRequest, Response, Headers } from './http';
import { REQUEST_TIMEOUT_MS } from './config';
import { getLogger } from '@optimizely/js-sdk-logging';

const logger = getLogger('DatafileManager');

const GET_METHOD = 'GET';
const READY_STATE_DONE = 4;

function parseHeadersFromXhr(req: XMLHttpRequest): Headers {
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

function setHeadersInXhr(headers: Headers, req: XMLHttpRequest): void {
  Object.keys(headers).forEach(headerName => {
    const header = headers[headerName];
    req.setRequestHeader(headerName, header!);
  });
}

export function makeGetRequest(reqUrl: string, headers: Headers): AbortableRequest {
  const req = new XMLHttpRequest();

  const responsePromise: Promise<Response> = new Promise((resolve, reject) => {
    req.open(GET_METHOD, reqUrl, true);

    setHeadersInXhr(headers, req);

    req.onreadystatechange = (): void => {
      if (req.readyState === READY_STATE_DONE) {
        const statusCode = req.status;
        if (statusCode === 0) {
          reject(new Error('Request error'));
          return;
        }

        const headers = parseHeadersFromXhr(req);
        const resp: Response = {
          statusCode: req.status,
          body: req.responseText,
          headers,
        };
        resolve(resp);
      }
    };

    req.timeout = REQUEST_TIMEOUT_MS;

    req.ontimeout = (): void => {
      logger.error('Request timed out');
    };

    req.send();
  });

  return {
    responsePromise,
    abort(): void {
      req.abort();
    },
  };
}
