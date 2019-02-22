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
var fns = require('../utils/fns');

function EventDispatcherBridge(oldEventDispatcher) {
  this.dispatcher = oldEventDispatcher;
}

EventDispatcherBridge.prototype.dispatch = function(request, callback) {
  console.log('dispatching', request.event);
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

  if (!fns.isEmpty(maybePromise) && typeof maybePromise.then === 'function') {
    maybePromise.then(function() {
      callback();
    });
  }
};

module.exports = EventDispatcherBridge;
