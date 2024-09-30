import { getForwardingEventProcessor } from './forwarding_event_processor';
import { EventDispatcher } from './eventDispatcher';
import { EventProcessor } from './eventProcessor';
import { default as defaultEventDispatcher } from './default_dispatcher.browser';

export const createForwardingEventProcessor = (
  eventDispatcher?: EventDispatcher,
): EventProcessor => {
  if (!eventDispatcher) {
    eventDispatcher = defaultEventDispatcher;
  }
  return getForwardingEventProcessor(eventDispatcher);
};
