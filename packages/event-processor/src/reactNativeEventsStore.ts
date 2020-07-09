
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
import { ReactNativeAsyncStorageCache, objectValues } from "@optimizely/js-sdk-utils"

import { ProcessableEvents } from "./eventProcessor"

// This Stores Formatted events before dispatching. The events are removed after they are successfully dispatched.
// Stored events are retried on every new event dispatch, when connection becomes available again or when SDK initializes the next time.
export class ReactNativePendingEventsStore {
  private storageKey: string = 'fs_optly_pending_events'
  private cache: ReactNativeAsyncStorageCache = new ReactNativeAsyncStorageCache()  
  private maxSize: number
  private synchronizer: Synchronizer = new Synchronizer()

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  public async set(key: string, event: any): Promise<string> {
    await this.synchronizer.getLock()
    const eventsMap = await this.cache.get(this.storageKey) || {}    
    if (Object.keys(eventsMap).length < this.maxSize) {
      eventsMap[key] = event
      await this.cache.set(this.storageKey, eventsMap)
    }
    this.synchronizer.releaseLock()
    return key
  }

  public async remove(key: string): Promise<void> {
    await this.synchronizer.getLock()
    const eventsMap = await this.cache.get(this.storageKey) || {}
    eventsMap[key] && delete eventsMap[key]
    await this.cache.set(this.storageKey, eventsMap)
    this.synchronizer.releaseLock()
  }

  public async get(key: string): Promise<any> {
    await this.synchronizer.getLock()
    const eventsMap = await this.cache.get(this.storageKey) || {}
    this.synchronizer.releaseLock()
    return eventsMap[key]
  }

  public async getAllEvents(): Promise<any[]> {
    await this.synchronizer.getLock()
    const eventsMap = await this.cache.get(this.storageKey) || {}
    this.synchronizer.releaseLock()
    return objectValues(eventsMap)
  }

  public async getEventsMap(): Promise<any> {
    return await this.cache.get(this.storageKey) || {}
  }
}

// This stores individual events generated from the SDK till they are part of the pending buffer.
// The store is cleared right before the event is formatted to be dispatched.
// This is to make sure that individual events are not lost when app closes before the buffer was flushed.
export class ReactNativeEventBufferStore {
  private storageKey: string = 'fs_optly_event_buffer'
  private cache: ReactNativeAsyncStorageCache = new ReactNativeAsyncStorageCache()
  private synchronizer: Synchronizer = new Synchronizer()

  public async add(event: ProcessableEvents) {
    await this.synchronizer.getLock()
    const events = await this.getAll()
    events.push(event)
    await this.cache.set(this.storageKey, events)
    this.synchronizer.releaseLock()
  }

  public async getAll(): Promise<ProcessableEvents[]> {
    return (await this.cache.get(this.storageKey) || []) as ProcessableEvents[]
  }

  public async clear(): Promise<void> {
    this.cache.remove(this.storageKey)
  }
}

// Both the above stores use single entry in the async storage store to manage their maps and lists.
// This results in race condition when two items are added to the map or array in parallel.
// for ex. Req 1 gets the map. Req 2 gets the map. Req 1 sets the map. Req 2 sets the map. The map now loses item from Req 1.
// This synchronizer makes sure the operations are atomic using promises.
class Synchronizer {
  private lockPromises: ResolvablePromise[] = []

  public async getLock(): Promise<void> {
    this.lockPromises.push(new ResolvablePromise())
    if (this.lockPromises.length === 1) {
      return
    }
    await this.lockPromises[this.lockPromises.length - 2].getPromise()
  }

  public releaseLock(): void {
    if (this.lockPromises.length > 0) {
      const promise = this.lockPromises.shift()
      promise && promise.resolve()
      return
    }
  } 
}


// A Resolvable process to support synchornization block
export class ResolvablePromise {
  private resolver: any
  private promise: Promise<void>

  constructor() {
    this.promise = new Promise((resolve) => {
      this.resolver = resolve
    })
  }

  public resolve(): void {
    this.resolver()
  }

  public getPromise(): Promise<void> {
    return this.promise
  }
}
