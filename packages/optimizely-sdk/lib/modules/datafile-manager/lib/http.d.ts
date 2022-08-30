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
/**
 * Headers is the interface that bridges between the abstract datafile manager and
 * any Node-or-browser-specific http header types.
 * It's simplified and can only store one value per header name.
 * We can extend or replace this type if requirements change and we need
 * to work with multiple values per header name.
 */
export interface Headers {
    [header: string]: string | undefined;
}
export interface Response {
    statusCode?: number;
    body: string;
    headers: Headers;
}
export interface AbortableRequest {
    abort(): void;
    responsePromise: Promise<Response>;
}
