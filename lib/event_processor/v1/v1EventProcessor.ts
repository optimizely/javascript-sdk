/**
 * Copyright 2022-2024, Optimizely
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
import { getLogger } from '../../modules/logging'
import { NotificationSender } from '../../core/notification_center'

import { EventDispatcher, EventV1Request } from '../eventDispatcher'
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
import { ServiceState } from '../../service'
import { Consumer, Fn } from '../../utils/type'

const logger = getLogger('LogTierV1EventProcessor')

export class LogTierV1EventProcessor implements EventProcessor {
  private dispatcher: EventDispatcher
  private closingDispatcher?: EventDispatcher
  private queue: EventQueue<ProcessableEvent>
  private notificationCenter?: NotificationSender
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
    notificationCenter?: NotificationSender
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
    );
  }

  onDispatch(handler: Consumer<EventV1Request>): Fn {
    return () => {}
  }
  
  getState(): ServiceState {
    throw new Error('Method not implemented.')
  }
  onRunning(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  onTerminated(): Promise<void> {
    throw new Error('Method not implemented.')
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

      // TODO: this does not do anything if the dispatcher fails 
      // to dispatch. What should be done in that case?
      dispatcher.dispatchEvent(formattedEvent).finally(() => {
        resolve()
      })
      sendEventNotification(this.notificationCenter, formattedEvent)
    })
    this.requestTracker.trackRequest(reqPromise)
    return reqPromise
  }

  async process(event: ProcessableEvent): Promise<void> {
    this.queue.enqueue(event)
  }

  // TODO[OASIS-6649]: Don't use any type
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  stop(): Promise<any> {
    // swallow - an error stopping this queue shouldn't prevent this from stopping
    try {
      this.queue.stop()
      return this.requestTracker.onRequestsComplete()
    } catch (e) {
      logger.error('Error stopping EventProcessor: "%s"', Object(e).message, String(e))
    }
    return Promise.resolve()
  }

  async start(): Promise<void> {
    await this.queue.start()
  }
}
