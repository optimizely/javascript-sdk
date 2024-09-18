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

/**
 * List of key-value pairs to be used in an HTTP requests
 */
export interface Headers {
  [header: string]: string | undefined;
}

/**
 * Simplified Response object containing only needed information
 */
export interface Response {
  statusCode: number;
  body: string;
  headers: Headers;
}

/**
 * Cancellable request wrapper around a Promised response
 */
export interface AbortableRequest {
  abort(): void;
  responsePromise: Promise<Response>;
}

export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH';

/**
 * Client that handles sending requests and receiving responses
 */
export interface RequestHandler {
  makeRequest(requestUrl: string, headers: Headers, method: HttpMethod, data?: string): AbortableRequest;
}
