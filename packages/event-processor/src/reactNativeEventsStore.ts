
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

/**
 * A key value store which stores objects of type T with string keys
 */
export class ReactNativeEventsStore<T> {
  private maxSize: number
  private storageKey: string
  private synchronizer: Synchronizer = new Synchronizer()
  private cache: ReactNativeAsyncStorageCache = new ReactNativeAsyncStorageCache()

  constructor(maxSize: number, storageKey: string) {
    this.maxSize = maxSize
    this.storageKey = storageKey
  }

  public async set(key: string, event: T): Promise<string> {
    await this.synchronizer.getLock()
    const eventsMap: {[key: string]: T} = await this.cache.get(this.storageKey) || {}    
    if (Object.keys(eventsMap).length < this.maxSize) {
      eventsMap[key] = event
      await this.cache.set(this.storageKey, eventsMap)
    }
    this.synchronizer.releaseLock()
    return key
  }

  public async get(key: string): Promise<T> {
    await this.synchronizer.getLock()
    const eventsMap: {[key: string]: T} = await this.cache.get(this.storageKey) || {}
    this.synchronizer.releaseLock()
    return eventsMap[key]
  }

  public async getEventsMap(): Promise<{[key: string]: T}> {
    return await this.cache.get(this.storageKey) || {}
  }

  public async getEventsList(): Promise<T[]> {
    await this.synchronizer.getLock()
    const eventsMap: {[key: string]: T} = await this.cache.get(this.storageKey) || {}
    this.synchronizer.releaseLock()
    return objectValues(eventsMap)
  }

  public async remove(key: string): Promise<void> {
    await this.synchronizer.getLock()
    const eventsMap: {[key: string]: T} = await this.cache.get(this.storageKey) || {}
    eventsMap[key] && delete eventsMap[key]
    await this.cache.set(this.storageKey, eventsMap)
    this.synchronizer.releaseLock()
  }

  public async clear(): Promise<void> {
    await this.cache.remove(this.storageKey)
  }
}

/**
 * Both the above stores use single entry in the async storage store to manage their maps and lists.
 * This results in race condition when two items are added to the map or array in parallel.
 * for ex. Req 1 gets the map. Req 2 gets the map. Req 1 sets the map. Req 2 sets the map. The map now loses item from Req 1.
 * This synchronizer makes sure the operations are atomic using promises.
 */
class Synchronizer {
  private lockPromises: Promise<void>[] = []
  private resolvers: any[] = []

  // Adds a promise to the existing list and returns the promise so that the code block can wait for its turn
  public async getLock(): Promise<void> {
    this.lockPromises.push(new Promise(resolve => this.resolvers.push(resolve)))
    if (this.lockPromises.length === 1) {
      return
    }
    await this.lockPromises[this.lockPromises.length - 2]
  }

  // Resolves first promise in the array so that the code block waiting on the first promise can continue execution
  public releaseLock(): void {
    if (this.lockPromises.length > 0) {
      this.lockPromises.shift()
      const resolver = this.resolvers.shift()
      resolver()
      return
    }
  }
}
