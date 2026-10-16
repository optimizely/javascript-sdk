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

// Runs before the test. __CASE__ and __record are provided by run.mjs.
const testCase = globalThis.__CASE__;
const record = globalThis.__record;

// React Native's startup code replaces the ErrorUtils polyfill's handler (which rethrows) with one that
// reports the error (red box / fatal) and returns. Do the same, recording the error instead. Without this,
// a failed require outside module loading would be rethrown to the caller instead of reported as fatal.
globalThis.ErrorUtils.setGlobalHandler((error, isFatal) => {
  record('reportedError', { message: String((error && error.message) || error), isFatal });
});

// The app's own polyfills, loaded before the SDK.
if (testCase.customTextEncoder && typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = class CustomTextEncoder {
    get encoding() {
      return 'utf-8';
    }
    encode(str = '') {
      const utf8 = unescape(encodeURIComponent(str));
      const bytes = new Uint8Array(utf8.length);
      for (let i = 0; i < utf8.length; i++) {
        bytes[i] = utf8.charCodeAt(i);
      }
      return bytes;
    }
  };
}

if (testCase.customGetRandomValues && typeof globalThis.crypto?.getRandomValues !== 'function') {
  globalThis.crypto = globalThis.crypto || {};
  // Test only: Math.random is not cryptographically secure.
  globalThis.crypto.getRandomValues = function customGetRandomValues(array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}
