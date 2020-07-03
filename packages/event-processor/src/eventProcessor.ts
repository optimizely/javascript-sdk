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
import { ConversionEvent, ImpressionEvent, areEventContextsEqual } from './events'
import { EventDispatcher, EventV1Request } from './eventDispatcher'
import { EventQueue, DefaultEventQueue, SingleEventQueue } from './eventQueue'
import { getLogger } from '@optimizely/js-sdk-logging'
import { NOTIFICATION_TYPES, NotificationCenter } from '@optimizely/js-sdk-utils'
import RequestTracker from './requestTracker';

const logger = getLogger('EventProcessor')

export type ProcessableEvents = ConversionEvent | ImpressionEvent

export type EventDispatchResult = { result: boolean; event: ProcessableEvents }

export interface EventProcessor extends Managed {
  process(event: ProcessableEvents): void
}

const DEFAULT_FLUSH_INTERVAL = 30000 // Unit is ms - default flush interval is 30s
const DEFAULT_BATCH_SIZE = 10

export abstract class AbstractEventProcessor implements EventProcessor {
  protected dispatcher: EventDispatcher
  protected queue: EventQueue<ProcessableEvents>
  private notificationCenter?: NotificationCenter
  protected requestTracker: RequestTracker

  constructor({
    dispatcher,
    flushInterval = 30000,
    batchSize = 3000,
    notificationCenter,
  }: {
    dispatcher: EventDispatcher
    flushInterval?: number
    batchSize?: number
    notificationCenter?: NotificationCenter
  }) {
    this.dispatcher = dispatcher

    if (flushInterval <= 0) {
      logger.warn(
        `Invalid flushInterval ${flushInterval}, defaulting to ${DEFAULT_FLUSH_INTERVAL}`,
      )
      flushInterval = DEFAULT_FLUSH_INTERVAL
    }

    batchSize = Math.floor(batchSize)
    if (batchSize < 1) {
      logger.warn(
        `Invalid batchSize ${batchSize}, defaulting to ${DEFAULT_BATCH_SIZE}`,
      )
      batchSize = DEFAULT_BATCH_SIZE
    }

    batchSize = Math.max(1, batchSize)
    if (batchSize > 1) {
      this.queue = new DefaultEventQueue<ProcessableEvents>({
        flushInterval,
        maxQueueSize: batchSize,
        sink: buffer => this.drainQueue(buffer),
        batchComparator: areEventContextsEqual,
      })
    } else {
      this.queue = new SingleEventQueue({
        sink: buffer => this.drainQueue(buffer),
      })
    }
    this.notificationCenter = notificationCenter

    this.requestTracker = new RequestTracker()
  }

  drainQueue(buffer: ProcessableEvents[]): Promise<void> {
    const reqPromise = new Promise<void>(resolve => {
      logger.debug('draining queue with %s events', buffer.length)

      if (buffer.length === 0) {
        resolve()
        return
      }

      const formattedEvent = this.formatEvents(buffer)
      this.dispatcher.dispatchEvent(formattedEvent, () => {
        resolve()
      })
      this.sendEventNotification(formattedEvent)
    })
    this.requestTracker.trackRequest(reqPromise)
    return reqPromise
  }

  protected sendEventNotification(event: EventV1Request): void {
    if (this.notificationCenter) {
      this.notificationCenter.sendNotifications(
        NOTIFICATION_TYPES.LOG_EVENT,
        event,
      )
    }
  }

  process(event: ProcessableEvents): void {
    this.queue.enqueue(event)
  }

  stop(): Promise<any> {
    // swallow - an error stopping this queue shouldn't prevent this from stopping
    try {
      this.queue.stop()
      return this.requestTracker.onRequestsComplete()
    } catch (e) {
      logger.error('Error stopping EventProcessor: "%s"', e.message, e)
    }
    return Promise.resolve()
  }

  start(): void {
    this.queue.start()
  }

  protected abstract formatEvents(events: ProcessableEvents[]): EventV1Request
}
