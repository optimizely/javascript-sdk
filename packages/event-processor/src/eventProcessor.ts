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
import { ConversionEvent, ImpressionEvent, areEventContextsEqual } from './events'
import {
  EventDispatcher,
  EventV1Request,
} from './eventDispatcher'
import { EventQueue, DefaultEventQueue, SingleEventQueue } from './eventQueue'
import { getLogger } from '@optimizely/js-sdk-logging'

const logger = getLogger('EventProcessor')

export type ProcessableEvents = ConversionEvent | ImpressionEvent

export type EventDispatchResult = { result: boolean; event: ProcessableEvents }

export interface EventProcessor extends Managed {
  process(event: ProcessableEvents): void
}

const MIN_FLUSH_INTERVAL = 100
export abstract class AbstractEventProcessor implements EventProcessor {
  protected dispatcher: EventDispatcher
  protected queue: EventQueue<ProcessableEvents>

  constructor({
    dispatcher,
    flushInterval = 30000,
    maxQueueSize = 3000,
  }: {
    dispatcher: EventDispatcher
    flushInterval?: number
    maxQueueSize?: number
  }) {
    this.dispatcher = dispatcher

    maxQueueSize = Math.max(1, maxQueueSize)
    if (maxQueueSize > 1) {
      this.queue = new DefaultEventQueue<ProcessableEvents>({
        flushInterval: Math.max(flushInterval, MIN_FLUSH_INTERVAL),
        maxQueueSize,
        sink: buffer => this.drainQueue(buffer),
        batchComparator: areEventContextsEqual,
      })
    } else {
      this.queue = new SingleEventQueue({
        sink: buffer => this.drainQueue(buffer),
      })
    }
  }

  drainQueue(buffer: ProcessableEvents[]): Promise<void> {
    return new Promise(resolve => {
      logger.debug('draining queue with %s events', buffer.length)
      this.dispatcher.dispatchEvent(this.formatEvents(buffer), () => {
        resolve()
      })
    })
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

  protected abstract formatEvents(events: ProcessableEvents[]): EventV1Request
}
