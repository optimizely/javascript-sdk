import { RequestHandler } from '../../utils/http_request_handler/http';
import { DefaultEventDispatcher } from './default_dispatcher';
import { EventDispatcher } from './event_dispatcher';

export const createEventDispatcher = (requestHander: RequestHandler): EventDispatcher => {
  return new DefaultEventDispatcher(requestHander);
}
