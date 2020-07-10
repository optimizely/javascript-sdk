/**
 * Copyright 2019-2020, Optimizely
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
import { EventQueue, DefaultEventQueue, SingleEventQueue } from './eventQueue'
import { getLogger } from '@optimizely/js-sdk-logging'
import { NOTIFICATION_TYPES, NotificationCenter } from '@optimizely/js-sdk-utils'

const DEFAULT_FLUSH_INTERVAL = 30000 // Unit is ms - default flush interval is 30s
const DEFAULT_BATCH_SIZE = 10

const logger = getLogger('EventProcessor')

export type ProcessableEvents = ConversionEvent | ImpressionEvent

export type EventDispatchResult = { result: boolean; event: ProcessableEvents }

export interface EventProcessor extends Managed {
  process(event: ProcessableEvents): void
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

export function getQueue(batchSize: number, flushInterval: number, sink: any, batchComparator: any): EventQueue<ProcessableEvents> {
  let queue: EventQueue<ProcessableEvents>
  if (batchSize > 1) {
    queue = new DefaultEventQueue<ProcessableEvents>({
      flushInterval,
      maxQueueSize: batchSize,
      sink,
      batchComparator,
    })
  } else {
    queue = new SingleEventQueue({ sink })
  }
  return queue
}

export function sendEventNotification(notificationCenter: NotificationCenter | undefined, event: EventV1Request): void {
  if (notificationCenter) {
    notificationCenter.sendNotifications(
      NOTIFICATION_TYPES.LOG_EVENT,
      event,
    )
  }
}
