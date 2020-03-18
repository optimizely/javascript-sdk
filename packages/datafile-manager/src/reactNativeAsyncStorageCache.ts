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

import { getLogger } from '@optimizely/js-sdk-logging'
import AsyncStorage from '@react-native-community/async-storage'

import PersistentKeyValueCache from './persistentKeyValueCache'

const logger = getLogger('DatafileManager')

export default class ReactNativeAsyncStorageCache implements PersistentKeyValueCache {

  get(key: string): Promise<Object | null> {
    return new Promise((resolve, reject) => {
      AsyncStorage.getItem(key).then((val: string | null) => {
        if (val) {
          try {
            resolve(JSON.parse(val))
          } catch (ex) {
            logger.error('Error Parsing Object from cache - %s', ex)
            reject(ex)
          }
        } else {
          resolve(null)
        }
      }).catch(reject)
    })
  }
  
  set(key: string, val: Object): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        AsyncStorage.setItem(key, JSON.stringify(val)).then(resolve).catch(reject)
      } catch (e) {
        logger.error('Error stringifying Object to Json - %s', e)
        reject(e)
      }
    })
  }
  
  contains(key: string): Promise<Boolean> {
    return new Promise((resolve, reject) =>
      AsyncStorage.getItem(key).then((val: string | null) => resolve(val !== null)).catch(reject)
    )
  }
  
  remove(key: string): Promise<void> {
    return AsyncStorage.removeItem(key)
  }
}
