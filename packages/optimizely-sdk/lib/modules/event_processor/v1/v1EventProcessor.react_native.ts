/**
 * Copyright 2022, Optimizely
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
  uuid as id,
  objectEntries,
} from '../../../utils/fns'
import {
  NetInfoState,
  addEventListener as addConnectionListener,
} from "@react-native-community/netinfo"
import { getLogger } from '../../logging'
import { NotificationSender } from '../../../core/notification_center'

import {
  getQueue,
  EventProcessor,
  ProcessableEvent,
  sendEventNotification,
  validateAndGetBatchSize,
  validateAndGetFlushInterval,
  DEFAULT_BATCH_SIZE,
  DEFAULT_FLUSH_INTERVAL,  
} from "../eventProcessor"
import { ReactNativeEventsStore } from '../reactNativeEventsStore'
import { Synchronizer } from '../synchronizer'
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
const PENDING_EVENTS_STORE_KEY = 'fs_optly_pending_events'
const EVENT_BUFFER_STORE_KEY = 'fs_optly_event_buffer'

/**
 * React Native Events Processor with Caching support for events when app is offline.
 */
export class LogTierV1EventProcessor implements EventProcessor {
  private dispatcher: EventDispatcher
  // expose for testing
  public queue: EventQueue<ProcessableEvent>
  private notificationSender?: NotificationSender
  private requestTracker: RequestTracker

  /* eslint-disable */
  private unsubscribeNetInfo: Function | null = null
  /* eslint-enable */
  private isInternetReachable = true
  private pendingEventsPromise: Promise<void> | null = null
  private synchronizer: Synchronizer = new Synchronizer()

  // If a pending event fails to dispatch, this indicates skipping further events to preserve sequence in the next retry.
  private shouldSkipDispatchToPreserveSequence = false

  /**
   * This Stores Formatted events before dispatching. The events are removed after they are successfully dispatched.
   * Stored events are retried on every new event dispatch, when connection becomes available again or when SDK initializes the next time.
   */
  private pendingEventsStore: ReactNativeEventsStore<EventV1Request>
  
  /** 
   * This stores individual events generated from the SDK till they are part of the pending buffer.
   * The store is cleared right before the event is formatted to be dispatched.
   * This is to make sure that individual events are not lost when app closes before the buffer was flushed.
   */
  private eventBufferStore: ReactNativeEventsStore<ProcessableEvent>
  
  constructor({
    dispatcher,
    flushInterval = DEFAULT_FLUSH_INTERVAL,
    batchSize = DEFAULT_BATCH_SIZE,
    maxQueueSize = DEFAULT_MAX_QUEUE_SIZE,
    notificationCenter,
  }: {
    dispatcher: EventDispatcher
    flushInterval?: number
    batchSize?: number
    maxQueueSize?: number
    notificationCenter?: NotificationSender
  }) {
    this.dispatcher = dispatcher
    this.notificationSender = notificationCenter
    this.requestTracker = new RequestTracker()
    
    flushInterval = validateAndGetFlushInterval(flushInterval)
    batchSize = validateAndGetBatchSize(batchSize)
    this.queue = getQueue(batchSize, flushInterval, this.drainQueue.bind(this), areEventContextsEqual)
    this.pendingEventsStore = new ReactNativeEventsStore(maxQueueSize, PENDING_EVENTS_STORE_KEY)
    this.eventBufferStore = new ReactNativeEventsStore(maxQueueSize, EVENT_BUFFER_STORE_KEY)
  }

  private async connectionListener(state: NetInfoState) {
    if (this.isInternetReachable && !state.isInternetReachable) {
      this.isInternetReachable = false
      logger.debug('Internet connection lost')
      return
    }
    if (!this.isInternetReachable && state.isInternetReachable) {
      this.isInternetReachable = true
      logger.debug('Internet connection is restored, attempting to dispatch pending events')
      await this.processPendingEvents()
      this.shouldSkipDispatchToPreserveSequence = false
    }
  }

  private isSuccessResponse(status: number): boolean {
    return status >= 200 && status < 400
  }

  private async drainQueue(buffer: ProcessableEvent[]): Promise<void> {
    if (buffer.length === 0) {     
      return
    }

    await this.synchronizer.getLock()    

    // Retry pending failed events while draining queue
    await this.processPendingEvents()

    logger.debug('draining queue with %s events', buffer.length)

    const eventCacheKey = id()
    const formattedEvent = formatEvents(buffer)

    // Store formatted event before dispatching to be retried later in case of failure.
    await this.pendingEventsStore.set(eventCacheKey, formattedEvent)

    // Clear buffer because the buffer has become a formatted event and is already stored in pending cache.
    for (const {uuid} of buffer) {
      await this.eventBufferStore.remove(uuid)
    }

    if (!this.shouldSkipDispatchToPreserveSequence) {
      await this.dispatchEvent(eventCacheKey, formattedEvent)
    }

    // Resetting skip flag because current sequence of events have all been processed
    this.shouldSkipDispatchToPreserveSequence = false

    this.synchronizer.releaseLock()
  }

  private async processPendingEvents(): Promise<void> {
    logger.debug('Processing pending events from offline storage')
    if (!this.pendingEventsPromise) {
      // Only process events if existing promise is not in progress
      this.pendingEventsPromise = this.getPendingEventsPromise()
    } else {
      logger.debug('Already processing pending events, returning the existing promise')
    }
    await this.pendingEventsPromise
    this.pendingEventsPromise = null
  }

  private async getPendingEventsPromise(): Promise<void> {
    const formattedEvents: {[key: string]: any} = await this.pendingEventsStore.getEventsMap()
    const eventEntries = objectEntries(formattedEvents)
    logger.debug('Processing %s pending events', eventEntries.length)
    // Using for loop to be able to wait for previous dispatch to finish before moving on to the new one
    for (const [eventKey, event] of eventEntries) {
      // If one event dispatch failed, skip subsequent events to preserve sequence
      if (this.shouldSkipDispatchToPreserveSequence) {
        return
      }
      await this.dispatchEvent(eventKey, event)
    }
  }

  private async dispatchEvent(eventCacheKey: string, event: EventV1Request): Promise<void> {
    const requestPromise = new Promise<void>((resolve) => {
      this.dispatcher.dispatchEvent(event, async ({ statusCode }: EventDispatcherResponse) => {
        if (this.isSuccessResponse(statusCode)) {
          await this.pendingEventsStore.remove(eventCacheKey)
        } else {
          this.shouldSkipDispatchToPreserveSequence = true
          logger.warn('Failed to dispatch event, Response status Code: %s', statusCode)
        }
        resolve()
      })
      sendEventNotification(this.notificationSender, event)
    })
    // Tracking all the requests to dispatch to make sure request is completed before fulfilling the `stop` promise
    this.requestTracker.trackRequest(requestPromise)
    return requestPromise
  }

  public async start(): Promise<void> {
    this.queue.start()
    this.unsubscribeNetInfo = addConnectionListener(this.connectionListener.bind(this))

    await this.processPendingEvents()
    this.shouldSkipDispatchToPreserveSequence = false

    // Process individual events pending from the buffer.
    const events: ProcessableEvent[] = await this.eventBufferStore.getEventsList()
    await this.eventBufferStore.clear()
    events.forEach(this.process.bind(this))
  }

  public process(event: ProcessableEvent): void {
    // Adding events to buffer store. If app closes before dispatch, we can reprocess next time the app initializes
    this.eventBufferStore.set(event.uuid, event).then(() => {
      this.queue.enqueue(event)
    })
  }

  public async stop(): Promise<void> {
    // swallow - an error stopping this queue shouldn't prevent this from stopping
    try {
      this.unsubscribeNetInfo && this.unsubscribeNetInfo()
      await this.queue.stop()
      return this.requestTracker.onRequestsComplete()
    } catch (e) {
      logger.error('Error stopping EventProcessor: "%s"', e.message, String(e))
    }
  }
}
