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
import { getLogger } from '@optimizely/js-sdk-logging'
import {
  NetInfoState,
  addEventListener as addConnectionListener,
} from "@react-native-community/netinfo"

import { EventDispatcher } from './eventDispatcher'
import { ProcessableEvents, AbstractEventProcessor } from "./eventProcessor"
import { ReactNativePendingEventsStore, ReactNativeEventBufferStore } from './reactNativeEventsStore'

const logger = getLogger('ReactNativeEventProcessor')

const DEFAULT_MAX_QUEUE_SIZE = 10000

export abstract class AbstractReactNativeEventProcessor extends AbstractEventProcessor {
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
    super({ dispatcher, flushInterval, batchSize, notificationCenter })
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

      const formattedEvent = this.formatEvents(buffer)
      const cacheKey = generateUUID()
      this.eventsInProgress[cacheKey] = true

      // Store formatted event before dispatching.
      await this.pendingEventsStore.set(cacheKey, formattedEvent)

      // Clear buffer because the buffer has become a formatted event and is already stored in pending cache.
      await this.eventBufferStore.clear()

      this.dispatcher.dispatchEvent(formattedEvent, (status: number) => {
        delete this.eventsInProgress[cacheKey]
        if (this.isSuccessResponse(status)) {
          this.pendingEventsStore.remove(cacheKey).then(() => resolve())
        } else {
          resolve()
        }
      })
      this.sendEventNotification(formattedEvent)
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
          this.dispatcher.dispatchEvent(formattedEvent, (status: number) => {
            delete this.eventsInProgress[eventKey]
            if (this.isSuccessResponse(status)) {
              this.pendingEventsStore.remove(eventKey).then(() => resolve())
            } else {
              resolve()
            }
          })
          this.sendEventNotification(formattedEvent)
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
    super.process(event)
  }

  start(): void {
    super.start()
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
    return super.stop()
  }
}
