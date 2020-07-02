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
  objectValues,
  NOTIFICATION_TYPES,
  ReactNativeAsyncStorageCache,
  generateUUID,  
} from '@optimizely/js-sdk-utils'
import { getLogger } from '@optimizely/js-sdk-logging'

import { ProcessableEvents } from "../eventProcessor"
import { LogTierV1EventProcessor } from "./v1EventProcessor"
import { EventV1Request } from '../eventDispatcher'

const logger = getLogger('ReactNativeEventProcessor')

export class ReactNativeEventProcessor extends LogTierV1EventProcessor {
  private store: ReactNativeEventsStore = new ReactNativeEventsStore()
  private bufferStore: ReactNativeBufferStore = new ReactNativeBufferStore()

  sendEventNotification(event: EventV1Request): void {
    if (this.notificationCenter) {
      this.notificationCenter.sendNotifications(
        NOTIFICATION_TYPES.LOG_EVENT,
        event,
      )
    }
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

      await this.store.set(cacheKey, formattedEvent)
      // Clear buffer because the buffer has become a formatted event and is already stored in pending cache.
      this.bufferStore.clear()
      this.dispatcher.dispatchEvent(formattedEvent, (status: number) => {
        if (status < 200 || status >= 400) {
          resolve()
        } else {
          this.store.remove(cacheKey).then(() => resolve())
        }
      })

      this.sendEventNotification(formattedEvent)
    })
    this.requestTracker.trackRequest(reqPromise)
    return Promise.all([ ...pendingEventRequests, reqPromise]).then(() => {})
  }

  async processPendingEvents(): Promise<Promise<void>[]> {
    const formattedEvents: {[key: string]: EventV1Request} = await this.store.getEventsMap()
    const eventKeys: string[] = Object.keys(formattedEvents)
    const pendingEventRequests: Promise<void>[] = []
    for (let i = 0; i < eventKeys.length; i++) {
      const eventKey = eventKeys[i]
      pendingEventRequests.push(new Promise<void>((resolve) => {
        const formattedEvent = formattedEvents[eventKey]
        this.dispatcher.dispatchEvent(formattedEvent, (status: number) => {
          if (status < 200 || status >= 400) {
            resolve()
          } else {
            this.store.remove(eventKey).then(() => resolve())
          }
        })
        this.sendEventNotification(formattedEvent)
      }))

      //TODO: Zeeshan - Add details of why i added this kludge.
      await (() => new Promise(resolve => setTimeout(resolve)))()
    }
    return pendingEventRequests
  }
  
  process(event: ProcessableEvents): void {
    //TODO: Zeeshan - Add event to buffer store
    this.bufferStore.add(event)
    super.process(event)
  }

  start(): void {
    super.start()
    this.processPendingEvents()
    this.bufferStore.getAll().then((events: ProcessableEvents[]) => {
      events.forEach((event: ProcessableEvents) => this.process(event))
    })
  }
}

// A Resolvable process to support synchornization block
class ResolvablePromise extends Promise<void> {
  private resolver: any

  constructor() {
    var res
    super((resolve) => {
      res = resolve
    })
    this.resolver = res
  }

  public resolve(): void {
    this.resolver()
  }
}

class ReactNativeEventsStore {
  private storageKey: string = 'fs_optly_pending_events'
  private cache: ReactNativeAsyncStorageCache = new ReactNativeAsyncStorageCache()
  private lockPromises: ResolvablePromise[] = []

  private async getLock(): Promise<void> {
    this.lockPromises.push(new ResolvablePromise())
    if (this.lockPromises.length === 1) {
      return
    }
    await this.lockPromises[this.lockPromises.length - 2]
  }

  private releaseLock(): void {
    if (this.lockPromises.length > 0) {
      const promise = this.lockPromises.shift()
      promise && promise.resolve()
      return
    }
  }

  public async set(key: string, event: any): Promise<string> {
    await this.getLock()
    const eventsMap = await this.cache.get(this.storageKey) || {}
    eventsMap[key] = event
    await this.cache.set(this.storageKey, eventsMap)
    this.releaseLock()
    return key
  }

  public async remove(key: string): Promise<void> {
    await this.getLock()
    const eventsMap = await this.cache.get(this.storageKey) || {}
    eventsMap[key] && delete eventsMap[key]
    await this.cache.set(this.storageKey, eventsMap)
    this.releaseLock()
  }

  public async get(key: string): Promise<any> {
    await this.getLock()
    const eventsMap = await this.cache.get(this.storageKey) || {}
    this.releaseLock()
    return eventsMap[key]
  }

  public async getAllEvents(): Promise<any[]> {
    await this.getLock()
    const eventsMap = await this.cache.get(this.storageKey) || {}
    //await this.cache.remove(this.storageKey)
    this.releaseLock()
    return objectValues(eventsMap)
  }

  public async getEventsMap(): Promise<any> {
    return await this.cache.get(this.storageKey) || {}
  }
}

class ReactNativeBufferStore {
  private storageKey: string = 'fs_optly_event_buffer'
  private cache: ReactNativeAsyncStorageCache = new ReactNativeAsyncStorageCache()

  private lockPromises: ResolvablePromise[] = []

  private async getLock(): Promise<void> {
    this.lockPromises.push(new ResolvablePromise())
    if (this.lockPromises.length === 1) {
      return
    }
    await this.lockPromises[this.lockPromises.length - 2]
  }

  private releaseLock(): void {
    if (this.lockPromises.length > 0) {
      const promise = this.lockPromises.shift()
      promise && promise.resolve()
      return
    }
  }

  public async add(event: ProcessableEvents) {
    await this.getLock()
    const events = await this.getAll()
    events.push(event)
    this.cache.set(this.storageKey, events)
    await this.releaseLock()
  }

  public async getAll(): Promise<ProcessableEvents[]> {
    return (await this.cache.get(this.storageKey) || []) as ProcessableEvents[]
  }

  public async clear(): Promise<void> {
    this.cache.remove(this.storageKey)
  }
}
