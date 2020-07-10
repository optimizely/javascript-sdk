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
import { EventDispatcher, EventDispatcherResponse } from '../eventDispatcher'

const logger = getLogger('ReactNativeEventProcessor')

const DEFAULT_MAX_QUEUE_SIZE = 10000

export abstract class LogTierV1EventProcessor implements EventProcessor {
  protected dispatcher: EventDispatcher
  protected queue: EventQueue<ProcessableEvents>
  private notificationCenter?: NotificationCenter
  protected requestTracker: RequestTracker

  private pendingEventsStore: ReactNativePendingEventsStore
  private eventBufferStore: ReactNativeEventBufferStore = new ReactNativeEventBufferStore()
  private unsubscribeNetInfo: Function | null = null
  private isInternetReachable: boolean = true
  private isProcessingPendingEvents: boolean = false
  private pendingEventsPromise: Promise<void> | null = null

  // Tracks the events which are being dispatched to prevent from dispatching twice.
  private eventsInProgress: {} = {}

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

  isSuccessResponse(status: number): boolean {
    return status >= 200 && status < 400
  }

  async drainQueue(buffer: ProcessableEvents[]): Promise<void> {
    const pendingEventsPromise = this.processPendingEvents()
    this.requestTracker.trackRequest(pendingEventsPromise)
    await pendingEventsPromise
    const reqPromise = new Promise<void>(async (resolve) => {
      logger.debug('draining queue with %s events', buffer.length)

      if (buffer.length === 0) {
        resolve()
        return
      }

      const formattedEvent = formatEvents(buffer)
      const cacheKey = generateUUID()
      this.eventsInProgress[cacheKey] = true

      // Store formatted event before dispatching.
      await this.pendingEventsStore.set(cacheKey, formattedEvent)

      // Clear buffer because the buffer has become a formatted event and is already stored in pending cache.
      await this.eventBufferStore.clear()

      this.dispatcher.dispatchEvent(formattedEvent, ({ statusCode }: EventDispatcherResponse) => {
        delete this.eventsInProgress[cacheKey]
        if (this.isSuccessResponse(statusCode)) {
          this.pendingEventsStore.remove(cacheKey).then(() => resolve())
        } else {
          resolve()
        }
      })
      sendEventNotification(this.notificationCenter, formattedEvent)
    })
    this.requestTracker.trackRequest(reqPromise)
    return reqPromise
  }

  async processPendingEvents(): Promise<void> {
    // If pending events are already being dispatched, return the same promise
    if (this.isProcessingPendingEvents && this.pendingEventsPromise) {
      return this.pendingEventsPromise
    }
    this.pendingEventsPromise = new Promise(async (resolvePendingEventPromise) => {
      this.isProcessingPendingEvents = true
      const formattedEvents: {[key: string]: any} = await this.pendingEventsStore.getEventsMap()
      const eventKeys = Object.keys(formattedEvents)
      for (let i = 0; i < eventKeys.length; i++) {
        const eventKey = eventKeys[i]
        if (this.eventsInProgress[eventKey]) {
          continue
        }
        this.eventsInProgress[eventKey] = true
        const requestPromise = new Promise<void>((resolve) => {
          const formattedEvent = formattedEvents[eventKey]
          this.dispatcher.dispatchEvent(formattedEvent, ({ statusCode }: EventDispatcherResponse) => {
            delete this.eventsInProgress[eventKey]
            if (this.isSuccessResponse(statusCode)) {
              this.pendingEventsStore.remove(eventKey).then(() => resolve())
            } else {
              resolve()
            }
          })
          sendEventNotification(this.notificationCenter, formattedEvent)
        })
        // Waiting for last event to finish before dispatching the new one to ensure sequence
        await requestPromise
      }
      this.isProcessingPendingEvents = false
      resolvePendingEventPromise()
    })
    return this.pendingEventsPromise
  }

  process(event: ProcessableEvents): void {
    // Adding events to buffer store. If app closes before dispatch, we can reprocess next time the app initializes
    this.eventBufferStore.add(event)
    this.queue.enqueue(event)
  }

  start(): void {
    this.queue.start()
    this.unsubscribeNetInfo = addConnectionListener((state: NetInfoState) => {
      if (this.isInternetReachable && !state.isInternetReachable) {
        this.isInternetReachable = false
      }

      if (!this.isInternetReachable && state.isInternetReachable) {
        this.isInternetReachable = true
        // To make sure `eventProcessor.stop()` waits for pending events to completely process
        this.requestTracker.trackRequest(this.processPendingEvents())
      }
    })
    // Dispatch all the formatted pending events right away
    this.processPendingEvents().then(() => {
      // Process individual events pending from the buffer.
      this.eventBufferStore.getAll().then((events: ProcessableEvents[]) => {
        events.forEach((event: ProcessableEvents) => this.process(event))
      })
    })
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
