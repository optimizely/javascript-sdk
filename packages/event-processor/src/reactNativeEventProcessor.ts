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

import { EventDispatcher } from './eventDispatcher'
import { ProcessableEvents, AbstractEventProcessor } from "./eventProcessor"
import { ReactNativePendingEventsStore, ReactNativeEventBufferStore } from './reactNativeEventsStore'

const logger = getLogger('ReactNativeEventProcessor')

const DEFAULT_MAX_QUEUE_SIZE = 10000

export abstract class AbstractReactNativeEventProcessor extends AbstractEventProcessor {
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
    super({ dispatcher, flushInterval, batchSize, notificationCenter })
    this.pendingEventsStore = new ReactNativePendingEventsStore(maxQueueSize)
  }

  isSuccessResponse(status: number): boolean {
    return status >= 200 && status < 400
  }

  async drainQueue(buffer: ProcessableEvents[]): Promise<void> {
    const pendingEventRequests = await this.processPendingEvents()
    const reqPromise = new Promise<void>(async (resolve) => {
      logger.debug('draining queue with %s events', buffer.length)

      if (buffer.length === 0) {
        resolve()
        return
      }
      
      const formattedEvent = this.formatEvents(buffer)
      const cacheKey = generateUUID()

      // Store formatted event before dispatching.
      await this.pendingEventsStore.set(cacheKey, formattedEvent)

      // Clear buffer because the buffer has become a formatted event and is already stored in pending cache.
      this.eventBufferStore.clear()

      this.dispatcher.dispatchEvent(formattedEvent, (status: number) => {
        if (this.isSuccessResponse(status)) {
          this.pendingEventsStore.remove(cacheKey).then(() => resolve())
        } else {
          resolve()
        }
      })
      this.sendEventNotification(formattedEvent)
    })
    this.requestTracker.trackRequest(reqPromise)
    return Promise.all([ ...pendingEventRequests, reqPromise]).then(() => {})
  }

  async processPendingEvents(): Promise<Promise<void>[]> {
    const formattedEvents: {[key: string]: any} = await this.pendingEventsStore.getEventsMap()
    return Object.keys(formattedEvents).map(async (eventKey) => {
      const requestPromise = new Promise<void>((resolve) => {
        const formattedEvent = formattedEvents[eventKey]
        this.dispatcher.dispatchEvent(formattedEvent, (status: number) => {
          if (this.isSuccessResponse(status)) {
            this.pendingEventsStore.remove(eventKey).then(() => resolve())
          } else {
            resolve()
          }
        })
        this.sendEventNotification(formattedEvent)
      })

      // This is somehow needed to make sure events are dispatched in the correct order.
      // The dispatcher always hands over the requests to XMLHttpRequest in correct order
      // but for some reason, XMLHttpRequest internally mismanages the order and the events
      // are received by server in random order. This peice of code probably pushes each subsequent event's
      // processing to next iteration of javascript event loop somehow resulting in the correct predictable
      // behavior. This is definitely a kludge which appears to be working consistently as expected
      // when tested. I dont have a better logical explanation of this.
      await (() => new Promise(resolve => setTimeout(resolve)))()

      return requestPromise
    })
  }
  
  process(event: ProcessableEvents): void {
    // Adding events to buffer store. If app closes before dispatch, we can reprocess next time the app initializes
    this.eventBufferStore.add(event)
    super.process(event)
  }

  start(): void {
    super.start()

    // Dispatch all the formatted pending events right away
    this.processPendingEvents()

    // Process individual events pending from the buffer.
    this.eventBufferStore.getAll().then((events: ProcessableEvents[]) => {
      events.forEach((event: ProcessableEvents) => this.process(event))
    })
  }
}
