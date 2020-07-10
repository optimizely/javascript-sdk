/**
 * Copyright 2020, Optimizely
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
  generateUUID,
  NotificationCenter,
  objectEntries,
} from '@optimizely/js-sdk-utils'
import {
  NetInfoState,
  addEventListener as addConnectionListener,
} from "@react-native-community/netinfo"
import { getLogger } from '@optimizely/js-sdk-logging'

import {
  getQueue,
  EventProcessor,
  ProcessableEvents,
  sendEventNotification,
  validateAndGetBatchSize,
  validateAndGetFlushInterval,
} from "../eventProcessor"
import {
  ReactNativeEventBufferStore,
  ReactNativePendingEventsStore,
} from '../reactNativeEventsStore'
import { EventQueue } from '../eventQueue'
import RequestTracker from '../requestTracker'
import { areEventContextsEqual } from '../events'
import { formatEvents } from './buildEventV1'
import {
  EventV1Request,
  EventDispatcher,
  EventDispatcherResponse,
} from '../eventDispatcher'

const logger = getLogger('ReactNativeEventProcessor')

const DEFAULT_MAX_QUEUE_SIZE = 10000

export abstract class LogTierV1EventProcessor implements EventProcessor {
  private dispatcher: EventDispatcher
  private queue: EventQueue<ProcessableEvents>
  private notificationCenter?: NotificationCenter
  private requestTracker: RequestTracker
  
  private unsubscribeNetInfo: Function | null = null
  private isInternetReachable: boolean = true
  private pendingEventsPromise: Promise<void> | null = null
  
  private pendingEventsStore: ReactNativePendingEventsStore
  private eventBufferStore: ReactNativeEventBufferStore = new ReactNativeEventBufferStore()
  
  constructor({
    dispatcher,
    flushInterval = 30000,
    batchSize = 3000,
    maxQueueSize = DEFAULT_MAX_QUEUE_SIZE,
    notificationCenter,
  }: {
    dispatcher: EventDispatcher
    flushInterval?: number
    batchSize?: number
    maxQueueSize?: number
    notificationCenter?: NotificationCenter
  }) {
    this.dispatcher = dispatcher
    this.notificationCenter = notificationCenter
    this.requestTracker = new RequestTracker()
    
    flushInterval = validateAndGetFlushInterval(flushInterval)
    batchSize = validateAndGetBatchSize(batchSize)
    this.queue = getQueue(batchSize, flushInterval, this.drainQueue.bind(this), areEventContextsEqual)
    this.pendingEventsStore = new ReactNativePendingEventsStore(maxQueueSize)
  }

  start(): void {
    this.queue.start()
    this.unsubscribeNetInfo = addConnectionListener(async (state: NetInfoState) => {
      if (this.isInternetReachable && !state.isInternetReachable) {
        this.isInternetReachable = false
        return
      }

      if (!this.isInternetReachable && state.isInternetReachable) {
        this.isInternetReachable = true
        // To make sure `eventProcessor.stop()` waits for pending events to completely process
        this.processPendingEvents()
      }
    })
    // Dispatch all the formatted pending events right away
    this.processPendingEvents().then(() => {
      this.pendingEventsPromise = null
      // Process individual events pending from the buffer.
      this.eventBufferStore.getAll().then((events: ProcessableEvents[]) => {
        events.forEach((event: ProcessableEvents) => this.process(event))
      })
    })
  }

  isSuccessResponse(status: number): boolean {
    return status >= 200 && status < 400
  }

  async drainQueue(buffer: ProcessableEvents[]): Promise<void> {    
    await this.processPendingEvents()

    logger.debug('draining queue with %s events', buffer.length)

    if (buffer.length === 0) {
      return
    }


    const eventCacheKey = generateUUID()
    const formattedEvent = formatEvents(buffer)

    // Store formatted event before dispatching.
    await this.pendingEventsStore.set(eventCacheKey, formattedEvent)

    // Clear buffer because the buffer has become a formatted event and is already stored in pending cache.
    await this.eventBufferStore.clear()

    return this.dispatchEvent(eventCacheKey, formattedEvent)
  }

  async processPendingEvents(): Promise<void> {
    // If pending events are already being dispatched, wait for the promise to complete and then return
    // This is to prevent processing events twice if pending events are tried simultenously from two flows.
    // For example when there were pending events and device gained back connectivity.
    // At the same time, batch is complete and drainQueue attempts to process pending events.
    // It will then get the same pendingEventsPromise and wait for it so that the new events are 
    // successfully sequenced after the pending events are dispatched.
    if (this.pendingEventsPromise) {
      await this.pendingEventsPromise
      return
    }
    
    this.pendingEventsPromise = this.getPendingEventsPromise()
    await this.pendingEventsPromise

    // Clear pending events promise because its fulfilled now
    this.pendingEventsPromise = null
  }

  async getPendingEventsPromise(): Promise<void>{
    const formattedEvents: {[key: string]: any} = await this.pendingEventsStore.getEventsMap()
    const eventEntries = objectEntries(formattedEvents)
    for (let i = 0; i < eventEntries.length; i++) {
      const [eventKey, event] = eventEntries[i]
      await this.dispatchEvent(eventKey, event)
    }
  }
  
  async dispatchEvent(eventCacheKey: string, event: EventV1Request): Promise<void> {
    const requestPromise = new Promise<void>((resolve) => {
      this.dispatcher.dispatchEvent(event, async ({ statusCode }: EventDispatcherResponse) => {
        if (this.isSuccessResponse(statusCode)) {
          await this.pendingEventsStore.remove(eventCacheKey)
        }
        resolve()
      })
      sendEventNotification(this.notificationCenter, event)
    })
    this.requestTracker.trackRequest(requestPromise)
    return requestPromise
  }

  process(event: ProcessableEvents): void {
    // Adding events to buffer store. If app closes before dispatch, we can reprocess next time the app initializes
    this.eventBufferStore.add(event)
    this.queue.enqueue(event)
  }

  stop(): Promise<void> {
    this.unsubscribeNetInfo && this.unsubscribeNetInfo()
    // swallow - an error stopping this queue shouldn't prevent this from stopping
    try {
      this.queue.stop()
      return this.requestTracker.onRequestsComplete()
    } catch (e) {
      logger.error('Error stopping EventProcessor: "%s"', e.message, e)
    }
    return Promise.resolve()
  }
}
