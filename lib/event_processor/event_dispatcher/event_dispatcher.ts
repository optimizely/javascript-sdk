/**
 * Copyright 2022, 2024, Optimizely
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
import { EventBatch } from "../event_builder/log_event";

export type EventDispatcherResponse = {
  statusCode?: number  
}

export interface EventDispatcher {
  dispatchEvent(event: LogEvent): Promise<EventDispatcherResponse>
}

export interface LogEvent {
  url: string
  httpVerb: 'POST' | 'PUT' | 'GET' | 'PATCH'
  params: EventBatch,
}
