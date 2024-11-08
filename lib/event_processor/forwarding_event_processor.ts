/**
 * Copyright 2021-2024, Optimizely
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

import {
  EventProcessor,
  EventV1Request,
  ProcessableEvent,
} from '.';
import { NotificationSender } from '../core/notification_center';

import { EventDispatcher } from '../shared_types';
import { NOTIFICATION_TYPES } from '../utils/enums';
import { formatEvents } from '../core/event_builder/build_event_v1';
import { BaseService, ServiceState } from '../service';
import { EventEmitter } from '../utils/event_emitter/event_emitter';
import { Consumer, Fn } from '../utils/type';
class ForwardingEventProcessor extends BaseService implements EventProcessor {
  private dispatcher: EventDispatcher;
  private eventEmitter: EventEmitter<{ dispatch: EventV1Request }>;

  constructor(dispatcher: EventDispatcher) {
    super();
    this.dispatcher = dispatcher;
    this.eventEmitter = new EventEmitter();
  }

  process(event: ProcessableEvent): Promise<unknown> {
    const formattedEvent = formatEvents([event]);
    const res = this.dispatcher.dispatchEvent(formattedEvent);
    this.eventEmitter.emit('dispatch', formattedEvent);
    return res;
  }
  
  start(): void {
    if (!this.isNew()) {
      return;
    }
    this.state = ServiceState.Running;
    this.startPromise.resolve();
  }
  
  stop(): void {
    if (this.isDone()) {
      return;
    }

    if (this.isNew()) {
      this.startPromise.reject(new Error('Service stopped before it was started'));
    }

    this.state = ServiceState.Terminated;
    this.stopPromise.resolve();
  }

  onDispatch(handler: Consumer<EventV1Request>): Fn {
    return this.eventEmitter.on('dispatch', handler);
  }
}

export function getForwardingEventProcessor(dispatcher: EventDispatcher): EventProcessor {
  return new ForwardingEventProcessor(dispatcher);
}
