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

  get(key: string): Promise<any | null> {
    try {
      return AsyncStorage.getItem(key)
        .then((val: string | null) => val ? JSON.parse(val) : null)
    } catch (ex) {
      logger.error('Error Parsing Object from cache - %s', ex)
      return Promise.resolve(ex);
    }
  }

  set(key: string, val: any): Promise<void> {    
    try {
      return AsyncStorage.setItem(key, JSON.stringify(val))
    } catch (e) {
      logger.error('Error stringifying Object to Json - %s', e)
      return Promise.reject(e)
    }
  }
  
  contains(key: string): Promise<Boolean> {
    return AsyncStorage.getItem(key).then((val: string | null) => (val !== null))
  }
  
  remove(key: string): Promise<void> {
    return AsyncStorage.removeItem(key)
  }
}
