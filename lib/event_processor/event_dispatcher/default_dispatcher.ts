/**
 * Copyright 2024, Optimizely
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
import { RequestHandler } from '../../utils/http_request_handler/http';
import { EventDispatcher, EventDispatcherResponse, LogEvent } from './event_dispatcher';

export class DefaultEventDispatcher implements EventDispatcher {
  private requestHandler: RequestHandler;

  constructor(requestHandler: RequestHandler) {
    this.requestHandler = requestHandler;
  }

  async dispatchEvent(
    eventObj: LogEvent
  ): Promise<EventDispatcherResponse> {
    // Non-POST requests not supported
    if (eventObj.httpVerb !== 'POST') {
      return Promise.reject(new Error('Only POST requests are supported'));
    }
  
    const dataString = JSON.stringify(eventObj.params);
  
    const headers = {
      'content-type': 'application/json',
      'content-length': dataString.length.toString(),
    };
  
    const abortableRequest = this.requestHandler.makeRequest(eventObj.url, headers, 'POST', dataString);
    return abortableRequest.responsePromise;
  }
}
