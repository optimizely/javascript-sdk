
import { RequestHandler } from '../../utils/http_request_handler/http';
import { EventDispatcher, EventDispatcherResponse, EventV1Request } from '../../event_processor';

export class DefaultEventDispatcher implements EventDispatcher {
  private requestHandler: RequestHandler;

  constructor(requestHandler: RequestHandler) {
    this.requestHandler = requestHandler;
  }

  async dispatchEvent(
    eventObj: EventV1Request
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
