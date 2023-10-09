/**
 * Copyright 2019-2020, 2023 Optimizely
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
import { getLogger } from '@optimizely/js-sdk-logging'
import { NotificationCenter } from '@optimizely/js-sdk-utils'

import { EventDispatcher } from '../eventDispatcher'
import {
  getQueue,
  EventProcessor,
  ProcessableEvent,
  sendEventNotification,
  validateAndGetBatchSize,
  validateAndGetFlushInterval,
  DEFAULT_BATCH_SIZE,
  DEFAULT_FLUSH_INTERVAL,
} from '../eventProcessor'
import { EventQueue } from '../eventQueue'
import RequestTracker from '../requestTracker'
import { areEventContextsEqual } from '../events'
import { formatEvents } from './buildEventV1'

const logger = getLogger('LogTierV1EventProcessor')

export class LogTierV1EventProcessor implements EventProcessor {
  private dispatcher: EventDispatcher
  private closingDispatcher?: EventDispatcher
  private queue: EventQueue<ProcessableEvent>
  private notificationCenter?: NotificationCenter
  private requestTracker: RequestTracker

  constructor({
    dispatcher,
    closingDispatcher,
    flushInterval = DEFAULT_FLUSH_INTERVAL,
    batchSize = DEFAULT_BATCH_SIZE,
    notificationCenter,
  }: {
    dispatcher: EventDispatcher
    closingDispatcher?: EventDispatcher
    flushInterval?: number
    batchSize?: number
    notificationCenter?: NotificationCenter
  }) {
    this.dispatcher = dispatcher
    this.closingDispatcher = closingDispatcher
    this.notificationCenter = notificationCenter
    this.requestTracker = new RequestTracker()
    
    flushInterval = validateAndGetFlushInterval(flushInterval)
    batchSize = validateAndGetBatchSize(batchSize)
    this.queue = getQueue(
      batchSize,
      flushInterval, 
      areEventContextsEqual,
      this.drainQueue.bind(this, false),
      this.drainQueue.bind(this, true),
    )
  }

  private drainQueue(useClosingDispatcher: boolean, buffer: ProcessableEvent[]): Promise<void> {
    const reqPromise = new Promise<void>(resolve => {
      logger.debug('draining queue with %s events', buffer.length)

      if (buffer.length === 0) {
        resolve()
        return
      }

      const formattedEvent = formatEvents(buffer)
      const dispatcher = useClosingDispatcher && this.closingDispatcher
        ? this.closingDispatcher : this.dispatcher;

      dispatcher.dispatchEvent(formattedEvent, () => {
        resolve()
      })
      sendEventNotification(this.notificationCenter, formattedEvent)
    })
    this.requestTracker.trackRequest(reqPromise)
    return reqPromise
  }

  process(event: ProcessableEvent): void {
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

  async start(): Promise<void> {
    this.queue.start()
  }
}
