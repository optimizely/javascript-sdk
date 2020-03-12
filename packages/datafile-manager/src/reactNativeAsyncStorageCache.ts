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

import AsyncStorage from '@react-native-community/async-storage';
import PersistentKeyValueCache from './persistentKeyValueCache';

export default class ReactNativeAsyncStorageCache implements PersistentKeyValueCache {
  // If value is a valid JSON string, it converts it to object before returning
  get(key: string): Promise<Object | string | null> {
    return new Promise((resolve, reject) => {
      AsyncStorage.getItem(key).then((val: String | null) => {
        let finalVal = val;
        if (val) {
          try {
            finalVal = JSON.parse(val.valueOf());
          } catch (ex) {
            // couldnt parse, its a string
          }       
        }
        resolve(finalVal);
      })
      .catch(reject);
    });
  }
  
  // If value is an Object, it stringifies it before storing.
  set(key: string, val: string | Object): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        AsyncStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : val)
          .then(resolve).catch(reject);
      } catch (e) {
        // JSON.stringify might through exception on some inputs.
        reject(e);
      }
    }); 
  }
  
  contains(key: string): Promise<Boolean> {
    return new Promise((resolve, reject) =>
      AsyncStorage.getItem(key).then((val: String | null) => resolve(val !== null)).catch(reject)
    )
  }
  
  remove(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  }
}
