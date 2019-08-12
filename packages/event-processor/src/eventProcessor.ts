/**
 * Copyright 2019, Optimizely
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
import {
  EventDispatcher,
  EventV1Request,
} from './eventDispatcher'
import { EventQueue, DefaultEventQueue, SingleEventQueue } from './eventQueue'
import { getLogger } from '@optimizely/js-sdk-logging'
import { NOTIFICATION_TYPES, NotificationCenter } from '@optimizely/js-sdk-utils'

const logger = getLogger('EventProcessor')

export type ProcessableEvents = ConversionEvent | ImpressionEvent

export type EventDispatchResult = { result: boolean; event: ProcessableEvents }

export interface EventProcessor extends Managed {
  process(event: ProcessableEvents): void
}

const DEFAULT_FLUSH_INTERVAL = 30000
const DEFAULT_MAX_QUEUE_SIZE = 10

export abstract class AbstractEventProcessor implements EventProcessor {
  protected dispatcher: EventDispatcher
  protected queue: EventQueue<ProcessableEvents>
  private notificationCenter?: NotificationCenter

  constructor({
    dispatcher,
    flushInterval = 30000,
    maxQueueSize = 3000,
    notificationCenter,
  }: {
    dispatcher: EventDispatcher
    flushInterval?: number
    maxQueueSize?: number
    notificationCenter?: NotificationCenter
  }) {
    this.dispatcher = dispatcher

    if (flushInterval <= 0) {
      logger.warn(`Invalid flushInterval ${flushInterval}, defaulting to ${DEFAULT_FLUSH_INTERVAL}`)
      flushInterval = DEFAULT_FLUSH_INTERVAL
    }

    maxQueueSize = Math.floor(maxQueueSize)
    if (maxQueueSize < 1) {
      logger.warn(`Invalid maxQueueSize, defaulting to ${DEFAULT_MAX_QUEUE_SIZE}`)
      maxQueueSize = DEFAULT_MAX_QUEUE_SIZE
    }

    maxQueueSize = Math.max(1, maxQueueSize)
    if (maxQueueSize > 1) {
      this.queue = new DefaultEventQueue({
        flushInterval,
        maxQueueSize,
        sink: buffer => this.drainQueue(buffer),
      })
    } else {
      this.queue = new SingleEventQueue({
        sink: buffer => this.drainQueue(buffer),
      })
    }
    this.notificationCenter = notificationCenter
  }

  drainQueue(buffer: ProcessableEvents[]): Promise<any> {
    logger.debug('draining queue with %s events', buffer.length)

    const promises = this.groupEvents(buffer).map(eventGroup => {
      const formattedEvent = this.formatEvents(eventGroup)

      return new Promise((resolve) => {
        this.dispatcher.dispatchEvent(formattedEvent, () => {
          resolve()
        })

        if (this.notificationCenter) {
          this.notificationCenter.sendNotifications(
            NOTIFICATION_TYPES.LOG_EVENT,
            formattedEvent
          )
        }
      })
    })

    return Promise.all(promises)
  }

  process(event: ProcessableEvents): void {
    this.queue.enqueue(event)
  }

  stop(): Promise<any> {
    try {
      // swallow, an error stopping this queue should prevent this from stopping
      return this.queue.stop()
    } catch (e) {
      logger.error('Error stopping EventProcessor: "%s"', e.message, e)
    }
    return Promise.resolve()
  }

  start(): void {
    this.queue.start()
  }

  protected abstract groupEvents(events: ProcessableEvents[]): ProcessableEvents[][]

  protected abstract formatEvents(events: ProcessableEvents[]): EventV1Request
}
