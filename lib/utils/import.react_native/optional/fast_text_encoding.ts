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

// Files in this directory are not bundled into the main SDK bundle; each is shipped as its own
// module under dist/react_native_optional (see rollup.config.mjs). Metro before 0.82.5 drops a missing
// optional dependency from the module's dependency map, which shifts every later require in that module.
// Keeping each optional require alone in its own module limits that to the require itself.

// murmurhash needs a global TextEncoder. Newer Hermes provides one; older Hermes and JSC do not.
// The try/catch lets Metro treat fast-text-encoding as an optional dependency
// (requires allowOptionalDependencies, which React Native's and Expo's default Metro configs enable).
if (typeof TextEncoder === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('fast-text-encoding');
  } catch (e) {
    throw new Error(
      'TextEncoder is not available in this environment. Install fast-text-encoding, ' +
      'or load another TextEncoder polyfill before importing the SDK.'
    );
  }
}

export const __platforms: Platform[] = ['react_native'];
