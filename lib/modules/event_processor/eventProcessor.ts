/**
 * Copyright 2022, Optimizely
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
// TODO change this to use Managed from js-sdk-models when available
import { Managed } from './managed'
import { ConversionEvent, ImpressionEvent } from './events'
import { EventV1Request } from './eventDispatcher'
import { EventQueue, DefaultEventQueue, SingleEventQueue, EventQueueSink } from './eventQueue'
import { getLogger } from '../logging'
import { NOTIFICATION_TYPES } from '../../utils/enums'
import { NotificationSender } from '../../core/notification_center'

export const DEFAULT_FLUSH_INTERVAL = 30000 // Unit is ms - default flush interval is 30s
export const DEFAULT_BATCH_SIZE = 10

const logger = getLogger('EventProcessor')

export type ProcessableEvent = ConversionEvent | ImpressionEvent

export type EventDispatchResult = { result: boolean; event: ProcessableEvent }

export interface EventProcessor extends Managed {
  process(event: ProcessableEvent): void
}

export function validateAndGetFlushInterval(flushInterval: number): number {
  if (flushInterval <= 0) {
    logger.warn(
      `Invalid flushInterval ${flushInterval}, defaulting to ${DEFAULT_FLUSH_INTERVAL}`,
    )
    flushInterval = DEFAULT_FLUSH_INTERVAL
  }
  return flushInterval
}

export function validateAndGetBatchSize(batchSize: number): number {
  batchSize = Math.floor(batchSize)
  if (batchSize < 1) {
    logger.warn(
      `Invalid batchSize ${batchSize}, defaulting to ${DEFAULT_BATCH_SIZE}`,
    )
    batchSize = DEFAULT_BATCH_SIZE
  }
  batchSize = Math.max(1, batchSize)
  return batchSize
}

export function getQueue(
  batchSize: number, 
  flushInterval: number, 
  batchComparator: (eventA: ProcessableEvent, eventB: ProcessableEvent) => boolean,
  sink: EventQueueSink<ProcessableEvent>,
  closingSink?: EventQueueSink<ProcessableEvent>
): EventQueue<ProcessableEvent> {
  let queue: EventQueue<ProcessableEvent>
  if (batchSize > 1) {
    queue = new DefaultEventQueue<ProcessableEvent>({
      flushInterval,
      maxQueueSize: batchSize,
      sink,
      closingSink,
      batchComparator,
    })
  } else {
    queue = new SingleEventQueue({ sink })
  }
  return queue
}

export function sendEventNotification(notificationSender: NotificationSender | undefined, event: EventV1Request): void {
  if (notificationSender) {
    notificationSender.sendNotifications(
      NOTIFICATION_TYPES.LOG_EVENT,
      event,
    )
  }
}
