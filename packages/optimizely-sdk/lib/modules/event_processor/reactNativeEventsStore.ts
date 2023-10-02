
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
import { getLogger } from '../logging'
import { objectValues } from "../../utils/fns"

import { Synchronizer } from './synchronizer'
import ReactNativeAsyncStorageCache from './reactNativeAsyncStorageCache'

const logger = getLogger('ReactNativeEventsStore')

/**
 * A key value store which stores objects of type T with string keys
 */
export class ReactNativeEventsStore<T> {
  private maxSize: number
  private storeKey: string
  private synchronizer: Synchronizer = new Synchronizer()
  private cache: ReactNativeAsyncStorageCache = new ReactNativeAsyncStorageCache()

  constructor(maxSize: number, storeKey: string) {
    this.maxSize = maxSize
    this.storeKey = storeKey
  }

  public async set(key: string, event: T): Promise<string> {
    await this.synchronizer.getLock()
    const eventsMap: {[key: string]: T} = await this.cache.get(this.storeKey) || {}    
    if (Object.keys(eventsMap).length < this.maxSize) {
      eventsMap[key] = event
      await this.cache.set(this.storeKey, eventsMap)
    } else {
      logger.warn('React native events store is full. Store key: %s', this.storeKey)
    }
    this.synchronizer.releaseLock()
    return key
  }

  public async get(key: string): Promise<T> {
    await this.synchronizer.getLock()
    const eventsMap: {[key: string]: T} = await this.cache.get(this.storeKey) || {}
    this.synchronizer.releaseLock()
    return eventsMap[key]
  }

  public async getEventsMap(): Promise<{[key: string]: T}> {
    return await this.cache.get(this.storeKey) || {}
  }

  public async getEventsList(): Promise<T[]> {
    await this.synchronizer.getLock()
    const eventsMap: {[key: string]: T} = await this.cache.get(this.storeKey) || {}
    this.synchronizer.releaseLock()
    return objectValues(eventsMap)
  }

  public async remove(key: string): Promise<void> {
    await this.synchronizer.getLock()
    const eventsMap: {[key: string]: T} = await this.cache.get(this.storeKey) || {}
    eventsMap[key] && delete eventsMap[key]
    await this.cache.set(this.storeKey, eventsMap)
    this.synchronizer.releaseLock()
  }

  public async clear(): Promise<void> {
    await this.cache.remove(this.storeKey)
  }
}
