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
 * Bridges the existing event dispatcher interface with the one in the eventProcessor
 *
 * new EventDispatcher interface
interface EventDispatcher {
  dispatch(event: object, callback: (success: boolean) => void): void
}

interface HttpRequest {
  url: string
  method: 'POST' | 'PUT' | 'GET' | 'PATCH'
  headers: {
    [key: string]: string[]
  }
  body: string
}

interface HttpEventDispatcher extends EventDispatcher {
  dispatch(request: HttpRequest, callback: (success: boolean) => void): void
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
    function(response) {
      // right now callbacks only happen if statusCode >= 200 && < 400
      callback(true);
    }
  );

  if (typeof maybePromise === 'object' && typeof maybePromise.then === 'function') {
    maybePromise.then(function() {
      callback(true);
    });
  }
};

module.exports = EventDispatcherBridge;
