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
/**
 * Bridges the existing event dispatcher interface with the HttpClient defined
 * in the eventProcessor package
 *
 * new EventDispatcher interface
export interface HttpClient {
  dispatch(event: EventV1Request, callback: (success: boolean) => void): void
}

export interface EventV1Request {
  url: string
  method: 'POST' | 'PUT' | 'GET' | 'PATCH'
  headers: {
    [key: string]: string[]
  }
  event: EventV1,
}
 */

function EventDispatcherBridge(oldEventDispatcher) {
  this.dispatcher = oldEventDispatcher;
}

EventDispatcherBridge.prototype.dispatch = function(request, callback) {
  var maybePromise = this.dispatcher.dispatchEvent(
    {
      httpVerb: request.method,
      url: request.url,
      params: request.event,
    },
    function(success) {
      // right now callbacks only happen if statusCode >= 200 && < 400
      callback(success);
    }
  );

  if (maybePromise !== null && typeof maybePromise === 'object' && typeof maybePromise.then === 'function') {
    maybePromise.then(function() {
      callback(true);
    });
  }
};

module.exports = EventDispatcherBridge;
