/**
 * Copyright 2019, Optimizely
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
import { objectValues } from '../../utils/fns'
import { getLogger } from '../logging';

const logger = getLogger('EventProcessor')

export interface PendingEventsStore<K> {
  get(key: string): K | null

  set(key: string, value: K): void

  remove(key: string): void

  values(): K[]

  clear(): void

  replace(newMap: { [key: string]: K }): void
}

interface StoreEntry {
  uuid: string
  timestamp: number
}

export class LocalStorageStore<K extends StoreEntry> implements PendingEventsStore<K> {
  protected LS_KEY: string
  protected maxValues: number

  constructor({ key, maxValues = 1000 }: { key: string; maxValues?: number }) {
    this.LS_KEY = key
    this.maxValues = maxValues
  }

  get(key: string): K | null {
    return this.getMap()[key] || null
  }

  set(key: string, value: K): void {
    const map = this.getMap()
    map[key] = value
    this.replace(map)
  }

  remove(key: string): void {
    const map = this.getMap()
    delete map[key]
    this.replace(map)
  }

  values(): K[] {
    return objectValues(this.getMap())
  }

  clear(): void {
    this.replace({})
  }

  replace(map: { [key: string]: K }): void {
    try {
      // This is a temporary fix to support React Native which does not have localStorage.
      window.localStorage && localStorage.setItem(this.LS_KEY, JSON.stringify(map))
      this.clean()
    } catch (e) {
      logger.error(e)
    }
  }

  private clean() {
    const map = this.getMap()
    const keys = Object.keys(map)
    const toRemove = keys.length - this.maxValues
    if (toRemove < 1) {
      return
    }

    const entries = keys.map(key => ({
      key,
      value: map[key]
    }))

    entries.sort((a, b) => a.value.timestamp - b.value.timestamp)

    for (let i = 0; i < toRemove; i++) {
      delete map[entries[i].key]
    }

    this.replace(map)
  }

  private getMap(): { [key: string]: K } {
    try {
      // This is a temporary fix to support React Native which does not have localStorage.
      const data = window.localStorage && localStorage.getItem(this.LS_KEY);
      if (data) {
        return (JSON.parse(data) as { [key: string]: K }) || {}
      }
    } catch (e) {
      logger.error(e)
    }
    return {}
  }
}
