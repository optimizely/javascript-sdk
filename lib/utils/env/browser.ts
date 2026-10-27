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

import { Platform } from '../../platform_support';

/**
 * Checks whether localStorage exists and is accessible. Referencing it throws a
 * ReferenceError where it is not defined (e.g. SSR) and a SecurityError where
 * storage is blocked (e.g. cookies disabled, sandboxed iframes).
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    return !!localStorage;
  } catch {
    return false;
  }
};

export const __platforms: Platform[] = ['browser'];
