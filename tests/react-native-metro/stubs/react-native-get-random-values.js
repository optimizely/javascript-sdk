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

// Stand-in for react-native-get-random-values, which needs native code. Like the real package, it only
// sets crypto.getRandomValues when there is none.
if (typeof global.crypto !== 'object') {
  global.crypto = {};
}

if (typeof global.crypto.getRandomValues !== 'function') {
  // Test only: Math.random is not cryptographically secure.
  global.crypto.getRandomValues = function getRandomValues(array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}
