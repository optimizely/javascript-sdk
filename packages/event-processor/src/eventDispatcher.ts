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
import { EventV1 } from "./v1/buildEventV1";

export type EventDispatcherResponse = {
  statusCode: number  
}

export type EventDispatcherCallback = (response: EventDispatcherResponse) => void

export interface EventDispatcher {
  dispatchEvent(event: EventV1Request, callback: EventDispatcherCallback): void
}

export interface EventV1Request {
  url: string
  httpVerb: 'POST' | 'PUT' | 'GET' | 'PATCH'
  params: EventV1,
}