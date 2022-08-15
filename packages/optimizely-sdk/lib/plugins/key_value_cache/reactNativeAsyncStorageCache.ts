/**
 * Copyright 2020, 2022, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import PersistentKeyValueCache from './persistentKeyValueCache';

export default class ReactNativeAsyncStorageCache implements PersistentKeyValueCache {
  async contains(key: string): Promise<boolean> {
    const val = await AsyncStorage.getItem(key);
    return val !== null;
  }

  async get(key: string): Promise<string> {
    const val =  await AsyncStorage.getItem(key);
    return val ? val : '';
  }

  async remove(key: string): Promise<boolean> {
    const wasFound = await this.contains(key);
    if (wasFound) {
      await AsyncStorage.removeItem(key);
      return true;
    }
    return false;
  }

  set(key: string, val: string): Promise<void> {
    return AsyncStorage.setItem(key, val);
  }
}
