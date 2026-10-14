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

import { Platform } from '../../../platform_support';

// Shipped as its own module so the optional require cannot shift others; see fast_text_encoding.ts.

// Required while this module loads rather than when loadAsyncStorageModule is called: on Metro before
// 0.82.5, requiring a missing module only throws to the caller during module loading. Outside of it,
// Metro reports the error as fatal and returns undefined instead of throwing.
let asyncStorageModule: { default?: unknown } | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  asyncStorageModule = require('@react-native-async-storage/async-storage');
} catch (e) {
  asyncStorageModule = undefined;
}

// Returns the @react-native-async-storage/async-storage module, or undefined if it is not available.
export const loadAsyncStorageModule = (): { default?: unknown } | undefined => asyncStorageModule;

export const __platforms: Platform[] = ['__universal__'];
