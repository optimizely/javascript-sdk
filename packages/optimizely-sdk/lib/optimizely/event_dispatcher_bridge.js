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

EventDispatcherBridge.prototype.dispatch = function(event, callback) {
  console.log('dispatching', JSON.parse(event.body))
  this.dispatcher.dispatchEvent({
    httpVerb: event.method,
    url: event.url,
    params: event.body,
  }, function(response) {
    // right now callbacks only happen if statusCode >= 200 && < 400
    callback(true);
  });
};

module.exports = EventDispatcherBridge;