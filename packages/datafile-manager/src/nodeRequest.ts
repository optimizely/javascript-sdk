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

import http from 'http'
import https from 'https'
import url from 'url'
import { Headers, AbortableRequest, Response } from './http'

// Shared signature between http.request and https.request
type ClientRequestCreator = (options: http.RequestOptions) => http.ClientRequest

function getRequestOptionsFromUrl(url: url.UrlWithStringQuery): http.RequestOptions {
  return {
    protocol: url.protocol,
    host: url.host,
    path: url.path,
  }
}

/**
 * Convert incomingMessage.headers (which has type http.IncomingHttpHeaders) into our Headers type defined in src/http.ts.
 *
 * Our Headers type is simplified and can't represent mutliple values for the same header name.
 *
 * We don't currently need multiple values support, and the consumer code becomes simpler if it can assume at-most 1 value
 * per header name.
 *
 */
function createHeadersFromNodeIncomingMessage(
  incomingMessage: http.IncomingMessage,
): Headers {
  const headers: Headers = {}
  Object.keys(incomingMessage.headers).forEach(headerName => {
    const headerValue = incomingMessage.headers[headerName]
    if (typeof headerValue === 'string') {
      headers[headerName] = headerValue
    } else if (typeof headerValue === 'undefined') {
    } else {
      // array
      if (headerValue.length > 0) {
        // We don't care about multiple values - just take the first one
        headers[headerName] = headerValue[0]
      }
    }
  })
  return headers
}

function getResponseFromRequest(request: http.ClientRequest): Promise<Response> {
  // TODO: When we drop support for Node 6, consider using util.promisify instead of
  // constructing own Promise
  return new Promise((resolve, reject) => {
    request.once('response', (incomingMessage: http.IncomingMessage) => {
      if (request.aborted) {
        return
      }

      incomingMessage.setEncoding('utf8')

      let responseData = ''
      incomingMessage.on('data', (chunk: string) => {
        if (!request.aborted) {
          responseData += chunk
        }
      })

      incomingMessage.on('end', () => {
        if (request.aborted) {
          return
        }

        resolve({
          statusCode: incomingMessage.statusCode,
          body: responseData,
          headers: createHeadersFromNodeIncomingMessage(incomingMessage),
        })
      })
    })

    request.on('error', (err: any) => {
      if (err instanceof Error) {
        reject(err)
      } else if (typeof err === 'string') {
        reject(new Error(err))
      } else {
        reject(new Error('Request error'))
      }
    })
  })
}

export function makeGetRequest(reqUrl: string, headers: Headers): AbortableRequest {
  // TODO: Use non-legacy URL parsing when we drop support for Node 6
  const parsedUrl = url.parse(reqUrl)

  let requester: ClientRequestCreator
  if (parsedUrl.protocol === 'http:') {
    requester = http.request
  } else if (parsedUrl.protocol === 'https:') {
    requester = https.request
  } else {
    return {
      responsePromise: Promise.reject(
        new Error(`Unsupported protocol: ${parsedUrl.protocol}`),
      ),
      abort() {},
    }
  }

  const requestOptions: http.RequestOptions = {
    ...getRequestOptionsFromUrl(parsedUrl),
    method: 'GET',
    headers,
  }

  const request = requester(requestOptions)
  const responsePromise = getResponseFromRequest(request)

  request.end()

  return {
    abort() {
      request.abort()
    },
    responsePromise,
  }
}
