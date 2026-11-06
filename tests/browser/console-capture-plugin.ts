/**
 * Copyright 2026, Optimizely
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
import type { Plugin } from 'vite';
import { consoleCapturePlugin as rootConsoleCapturePlugin } from '../../vitest/console-capture-plugin';

// Vitest 5 version of the root vitest/console-capture-plugin.ts. Reuses its
// /__vitest_console__ endpoint, but injects vitest/public/console-capture.js
// through transformIndexHtml, because the root plugin's response patching
// doesn't reach the tester page under Vitest 5. (The root plugin skips pages
// that already include the script, so it is never added twice.)
export function consoleCapturePlugin(): Plugin {
  return {
    ...(rootConsoleCapturePlugin() as unknown as Plugin),
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { src: '/console-capture.js' },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}
