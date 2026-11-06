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

// Loads the UMD bundle (copied to public/dist by run.js) in the tester page, so
// the spec can check the global it defines. Vitest runs the tester page through
// Vite's transformIndexHtml.
export function umdPlugin(): Plugin {
  return {
    name: 'umd-plugin',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { src: '/dist/optimizely.browser.umd.min.js' },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}
