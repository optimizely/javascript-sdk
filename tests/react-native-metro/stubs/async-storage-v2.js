/**
 * Copyright 2026, Optimizely
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

// In-memory stand-in for @react-native-async-storage/async-storage v1/v2, which has multiGet.
// Method calls are recorded in globalThis.__asyncStorageCalls.
const items = new Map();
const calls = (globalThis.__asyncStorageCalls = globalThis.__asyncStorageCalls || []);

const AsyncStorage = {
  getItem: (key) => { calls.push('getItem'); return Promise.resolve(items.has(key) ? items.get(key) : null); },
  setItem: (key, value) => { calls.push('setItem'); items.set(key, value); return Promise.resolve(); },
  removeItem: (key) => { calls.push('removeItem'); items.delete(key); return Promise.resolve(); },
  getAllKeys: () => { calls.push('getAllKeys'); return Promise.resolve([...items.keys()]); },
  clear: () => { calls.push('clear'); items.clear(); return Promise.resolve(); },
  multiGet: (keys) => {
    calls.push('multiGet');
    return Promise.resolve(keys.map((key) => [key, items.has(key) ? items.get(key) : null]));
  },
};

module.exports = { __esModule: true, default: AsyncStorage };
