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
const items: {[key: string]: string} = {}

export default class AsyncStorage {

  static getItem(key: string, callback?: (error?: Error, result?: string) => void): Promise<string | null> {
    return new Promise(resolve => {
      setTimeout(() => resolve(items[key] || null), 1)
    })
  }

  static setItem(key: string, value: string, callback?: (error?: Error) => void): Promise<void> {    
    return new Promise((resolve) => {
      setTimeout(() => {
        items[key] = value
        resolve()
      }, 1)
    })
  }

  static removeItem(key: string, callback?: (error?: Error, result?: string) => void): Promise<string | null> {
    return new Promise(resolve => {
      setTimeout(() => {
        items[key] && delete items[key]
        resolve()
      }, 1)
    })
  }

  static dumpItems(): {[key: string]: string} {
    return items
  }
}
