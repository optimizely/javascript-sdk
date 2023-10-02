/**
 * Copyright 2021-2022, Optimizely
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
  ProcessableEvent,
} from '../../../lib/modules/event_processor';
import { NotificationSender } from '../../core/notification_center';

import { EventDispatcher } from '../../shared_types';
import { NOTIFICATION_TYPES } from '../../utils/enums';
import { formatEvents } from '../../core/event_builder/build_event_v1';

class ForwardingEventProcessor implements EventProcessor {
  private dispatcher: EventDispatcher;
  private NotificationSender?: NotificationSender;

  constructor(dispatcher: EventDispatcher, notificationSender?: NotificationSender) {
    this.dispatcher = dispatcher;
    this.NotificationSender = notificationSender;
  }

  process(event: ProcessableEvent): void {
    const formattedEvent = formatEvents([event]);
    this.dispatcher.dispatchEvent(formattedEvent, () => {});
    if (this.NotificationSender) {
      this.NotificationSender.sendNotifications(
        NOTIFICATION_TYPES.LOG_EVENT,
        formattedEvent,
      )
    }
  }
  
  start(): Promise<any> {
    return Promise.resolve();
  }
  
  stop(): Promise<unknown> {
    return Promise.resolve();
  }
}

export function createForwardingEventProcessor(dispatcher: EventDispatcher, notificationSender?: NotificationSender): EventProcessor {
  return new ForwardingEventProcessor(dispatcher, notificationSender);
}
